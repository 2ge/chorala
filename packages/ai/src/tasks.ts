import { loadEnv } from '@chorala/config'
import {
  aiJobs,
  and,
  comments,
  db,
  desc,
  eq,
  feedbackClusters,
  gte,
  ilike,
  inArray,
  isNull,
  newId,
  or,
  organizations,
  posts,
  postTags,
  postTranslations,
  projects,
  sql,
  statuses,
  tags,
  votes,
} from '@chorala/db'
import type { LLMProvider } from './provider.ts'
import { analyzeSentiment, labelFor, type Sentiment } from './sentiment.ts'

const vec = (e: number[]) => `[${e.join(',')}]`

/** Embed a post's title+body → posts.embedding. No-op if the provider can't embed. */
export async function embedPost(provider: LLMProvider, postId: string): Promise<number[] | null> {
  if (!provider.enabled || !provider.canEmbed) return null
  const [post] = await db
    .select({ title: posts.title, body: posts.body })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post) return null
  const [embedding] = await provider.embed([`${post.title}\n\n${post.body}`])
  if (!embedding) return null
  await db.update(posts).set({ embedding }).where(eq(posts.id, postId))
  return embedding
}

export type DuplicateSuggestion = { postId: string; title: string; similarity: number }

/**
 * Find near-duplicate posts via pgvector cosine similarity. Records a suggestion
 * (ai_jobs, kind=dedup) for the admin to confirm — NEVER auto-merges (SPEC §11).
 */
export async function dedupPost(
  provider: LLMProvider,
  postId: string,
  threshold = loadEnv().CHORALA_AI_DEDUP_THRESHOLD,
): Promise<DuplicateSuggestion[]> {
  if (!provider.enabled || !provider.canEmbed) return []
  const [post] = await db
    .select({ projectId: posts.projectId, embedding: posts.embedding })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post?.embedding) return []

  const literal = vec(post.embedding as number[])
  const rows = await db.execute<{ id: string; title: string; similarity: number }>(sql`
    select id, title, 1 - (embedding <=> ${literal}::vector) as similarity
    from posts
    where project_id = ${post.projectId}
      and id <> ${postId}
      and merged_into_post_id is null
      and embedding is not null
    order by embedding <=> ${literal}::vector
    limit 5`)

  const suggestions = Array.from(rows)
    .map((r) => ({ postId: r.id, title: r.title, similarity: Number(r.similarity) }))
    .filter((r) => r.similarity >= threshold)

  if (suggestions.length > 0) {
    await db.insert(aiJobs).values({
      id: newId('aiJob'),
      projectId: post.projectId,
      kind: 'dedup',
      status: 'done',
      inputRef: postId,
      result: { suggestions },
    })
  }
  return suggestions
}

/** Translate a post into every org locale (besides its original) → post_translations. */
export async function translatePost(provider: LLMProvider, postId: string): Promise<string[]> {
  if (!provider.enabled) return []
  const [post] = await db
    .select({
      projectId: posts.projectId,
      originalLocale: posts.originalLocale,
      title: posts.title,
      body: posts.body,
    })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post) return []

  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, post.projectId))
  if (!project) return []
  const [org] = await db
    .select({ locales: organizations.locales })
    .from(organizations)
    .where(eq(organizations.id, project.orgId))
  const targets = (org?.locales ?? []).filter((l) => l !== post.originalLocale)

  const done: string[] = []
  for (const locale of targets) {
    const raw = await provider.complete({
      system:
        'You are a translator for product-feedback posts. Translate faithfully and return ONLY JSON of the form {"title": "...", "body": "..."}.',
      messages: [
        {
          role: 'user',
          content: `Translate to locale "${locale}".\nTitle: ${post.title}\nBody: ${post.body}`,
        },
      ],
      json: true,
    })
    let title = post.title
    let body = post.body
    try {
      const parsed = JSON.parse(raw) as { title?: string; body?: string }
      title = parsed.title ?? title
      body = parsed.body ?? body
    } catch {
      continue // skip locales the model returned unparseable output for
    }
    await db
      .insert(postTranslations)
      .values({ id: newId('postTranslation'), postId, locale, title, body, isAuto: true })
      .onConflictDoUpdate({
        target: [postTranslations.postId, postTranslations.locale],
        set: { title, body, isAuto: true },
      })
    done.push(locale)
  }
  return done
}

/** Run embed → dedup → translate → sentiment for a freshly created/edited post. */
export async function processPost(provider: LLMProvider, postId: string) {
  await embedPost(provider, postId)
  const suggestions = await dedupPost(provider, postId)
  const translated = await translatePost(provider, postId)
  // Refine the lexicon sentiment set at create-time with the LLM (no-op when disabled).
  if (provider.enabled) await scorePostSentiment(provider, postId)
  return { suggestions, translated }
}

/** Greedy cosine clustering of a project's embedded posts → feedback_clusters with AI labels. */
export async function clusterThemes(provider: LLMProvider, projectId: string) {
  if (!provider.enabled || !provider.canEmbed) return []
  const rows = await db
    .select({ id: posts.id, title: posts.title, embedding: posts.embedding })
    .from(posts)
    .where(
      and(
        eq(posts.projectId, projectId),
        sql`${posts.embedding} is not null`,
        sql`${posts.mergedIntoPostId} is null`,
      ),
    )
  if (rows.length === 0) return []

  const cosine = (a: number[], b: number[]) => {
    let dot = 0
    let na = 0
    let nb = 0
    for (let i = 0; i < a.length; i++) {
      dot += (a[i] ?? 0) * (b[i] ?? 0)
      na += (a[i] ?? 0) ** 2
      nb += (b[i] ?? 0) ** 2
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
  }

  const clusters: { centroid: number[]; ids: string[]; titles: string[] }[] = []
  for (const r of rows) {
    const emb = r.embedding as number[]
    const hit = clusters.find((c) => cosine(c.centroid, emb) >= 0.7)
    if (hit) {
      hit.ids.push(r.id)
      hit.titles.push(r.title)
    } else {
      clusters.push({ centroid: emb, ids: [r.id], titles: [r.title] })
    }
  }

  await db.delete(feedbackClusters).where(eq(feedbackClusters.projectId, projectId))
  const significant = clusters.filter((c) => c.ids.length >= 2)
  for (const c of significant) {
    const label = await provider.complete({
      system: 'Name this group of related feedback in 2-4 words. Return only the label.',
      messages: [{ role: 'user', content: c.titles.join('\n') }],
    })
    await db.insert(feedbackClusters).values({
      id: newId('cluster'),
      projectId,
      label: label.trim() || 'Theme',
      summary: `${c.ids.length} related posts`,
      postIds: c.ids,
      computedAt: new Date(),
    })
  }
  return significant
}

/** Summarize a post's discussion thread on demand. */
export async function summarizePost(provider: LLMProvider, postId: string): Promise<string> {
  if (!provider.enabled) return ''
  const [post] = await db
    .select({ title: posts.title, body: posts.body })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post) return ''
  const thread = await db
    .select({ body: comments.body })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.isInternal, false)))
  return provider.complete({
    system: 'Summarize this product-feedback thread in 2-3 sentences.',
    messages: [
      {
        role: 'user',
        content: `Title: ${post.title}\nBody: ${post.body}\nComments:\n${thread.map((c) => `- ${c.body}`).join('\n')}`,
      },
    ],
  })
}

export type ExtractedRequest = { title: string; body: string }

/**
 * Autopilot extraction (Phase 14): pull distinct feature requests / bug reports out of a raw
 * support conversation. With AI enabled the model returns a JSON array; with AI disabled we
 * gracefully fall back to capturing the whole conversation as a single request (so ingest still
 * works — AI only makes it *smarter*, never required, SPEC §2).
 */
export async function extractFeatureRequests(
  provider: LLMProvider,
  text: string,
): Promise<ExtractedRequest[]> {
  const clean = text.trim()
  if (!clean) return []

  if (!provider.enabled) {
    const title = (clean.split('\n')[0] ?? clean).slice(0, 120).trim() || clean.slice(0, 120)
    return [{ title, body: clean.slice(0, 4000) }]
  }

  const raw = await provider.complete({
    system:
      'You extract product feature requests and bug reports from a customer support conversation. ' +
      'Return ONLY a JSON array of {"title","body"} objects — one per DISTINCT request, the title a ' +
      "crisp ≤100-char summary and the body a one-paragraph description in the customer's words. " +
      'If the conversation contains no actionable product feedback, return [].',
    messages: [{ role: 'user', content: clean.slice(0, 8000) }],
    json: true,
  })
  try {
    const parsed = JSON.parse(raw) as unknown
    const arr = Array.isArray(parsed)
      ? parsed
      : ((parsed as { requests?: unknown[]; items?: unknown[] }).requests ??
        (parsed as { items?: unknown[] }).items ??
        [])
    return (arr as { title?: unknown; body?: unknown }[])
      .filter((x) => x && typeof x.title === 'string' && x.title.trim())
      .slice(0, 10)
      .map((x) => ({
        title: String(x.title).slice(0, 280).trim(),
        body: typeof x.body === 'string' ? x.body.slice(0, 4000) : '',
      }))
  } catch {
    return []
  }
}

export type AskResult = {
  answer: string
  aiEnabled: boolean
  sources: { id: string; title: string; voteCount: number }[]
}

/**
 * "Ask your feedback" (Phase 14): answer a natural-language question over a project's posts.
 * Uses semantic search when embeddings are available, else a keyword match; synthesizes an
 * answer with the LLM when enabled, otherwise returns the related posts (graceful degradation).
 */
export async function askFeedback(
  provider: LLMProvider,
  projectId: string,
  question: string,
): Promise<AskResult> {
  const q = question.trim()
  if (!q) return { answer: '', aiEnabled: provider.enabled, sources: [] }

  let sources: { id: string; title: string; voteCount: number; body: string }[] = []

  if (provider.enabled && provider.canEmbed) {
    const [embedding] = await provider.embed([q])
    if (embedding) {
      const literal = `[${embedding.join(',')}]`
      const rows = await db.execute<{
        id: string
        title: string
        body: string
        vote_count: number
      }>(sql`
        select id, title, body, vote_count
        from posts
        where project_id = ${projectId} and merged_into_post_id is null
          and review_status = 'none' and embedding is not null
        order by embedding <=> ${literal}::vector
        limit 8`)
      sources = Array.from(rows).map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        voteCount: r.vote_count,
      }))
    }
  }

  if (sources.length === 0) {
    // keyword fallback: match the question's significant words, rank by votes
    const words = q
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
    const wordMatch = words.length
      ? or(
          ...words.map((w) => ilike(posts.title, `%${w}%`)),
          ...words.map((w) => ilike(posts.body, `%${w}%`)),
        )
      : undefined
    sources = await db
      .select({ id: posts.id, title: posts.title, body: posts.body, voteCount: posts.voteCount })
      .from(posts)
      .where(
        and(
          eq(posts.projectId, projectId),
          eq(posts.reviewStatus, 'none'),
          sql`${posts.mergedIntoPostId} is null`,
          ...(wordMatch ? [wordMatch] : []),
        ),
      )
      .orderBy(desc(posts.voteCount))
      .limit(8)
  }

  let answer = ''
  if (provider.enabled && sources.length > 0) {
    answer = await provider.complete({
      system:
        'You are a product analyst. Answer the question using ONLY the feedback posts provided. ' +
        'Be concise (2-4 sentences) and cite themes, not post ids.',
      messages: [
        {
          role: 'user',
          content: `Question: ${q}\n\nFeedback posts:\n${sources
            .map((s) => `- ${s.title}: ${s.body}`)
            .join('\n')}`,
        },
      ],
    })
  }

  return {
    answer: answer.trim(),
    aiEnabled: provider.enabled,
    sources: sources.map((s) => ({ id: s.id, title: s.title, voteCount: s.voteCount })),
  }
}

/** Draft a markdown changelog entry from a set of shipped posts (MCP tool). */
export async function draftChangelogFromPosts(
  provider: LLMProvider,
  postIds: string[],
): Promise<string> {
  const rows =
    postIds.length > 0
      ? await db
          .select({ title: posts.title, body: posts.body })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : []
  const list = rows.map((r) => `- ${r.title}: ${r.body}`).join('\n')
  if (!provider.enabled) {
    // graceful fallback when AI is disabled: a plain templated draft
    return `## What's new\n\n${rows.map((r) => `- **${r.title}**`).join('\n')}`
  }
  return provider.complete({
    system:
      'Write a concise, friendly product changelog entry in markdown from these shipped items. Start with a short title line.',
    messages: [{ role: 'user', content: list }],
  })
}

// =====================================================================
// Phase 20 — AI depth (Autopilot v2). Every task has a deterministic fallback so it works
// with provider=none, and upgrades to the LLM when one is configured.
// =====================================================================

/**
 * Sentiment for a post (Phase 20). Uses the LLM when enabled (richer), else the deterministic
 * lexicon. Always writes `posts.sentiment` (−1..1) + `posts.sentimentLabel`.
 */
export async function scorePostSentiment(
  provider: LLMProvider,
  postId: string,
): Promise<Sentiment | null> {
  const [post] = await db
    .select({ title: posts.title, body: posts.body })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post) return null
  const text = `${post.title}\n\n${post.body}`

  let result = analyzeSentiment(text)
  if (provider.enabled) {
    try {
      const raw = await provider.complete({
        system:
          'You rate the sentiment of a product-feedback message. Return ONLY JSON {"score": <number -1..1>} where -1 is very negative and 1 is very positive.',
        messages: [{ role: 'user', content: text.slice(0, 4000) }],
        json: true,
        temperature: 0,
      })
      const parsed = JSON.parse(raw) as { score?: number }
      if (typeof parsed.score === 'number' && Number.isFinite(parsed.score)) {
        const score = Math.max(-1, Math.min(1, Math.round(parsed.score * 100) / 100))
        result = { score, label: labelFor(score) }
      }
    } catch {
      // keep the lexicon result on any model/parse failure
    }
  }
  await db
    .update(posts)
    .set({ sentiment: result.score, sentimentLabel: result.label })
    .where(eq(posts.id, postId))
  return result
}

/**
 * Auto-categorize: suggest which of a project's existing tags fit a piece of text (Phase 20).
 * Deterministic = the tag's name appears as a word in the text; AI = the model picks from the
 * tag list. Returns matching tag ids (a subset of the project's tags).
 */
export async function suggestTags(
  provider: LLMProvider,
  projectId: string,
  text: string,
): Promise<{ id: string; name: string }[]> {
  const projectTags = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.projectId, projectId))
  if (projectTags.length === 0 || !text.trim()) return []

  const deterministic = () => {
    const hay = text.toLowerCase()
    return projectTags.filter((t) => {
      const name = t.name.toLowerCase()
      return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hay)
    })
  }

  if (!provider.enabled) return deterministic()
  try {
    const raw = await provider.complete({
      system:
        'Pick the tags that apply to this feedback from the provided list. Return ONLY a JSON array of tag names, exactly as given, or [] if none clearly apply.',
      messages: [
        {
          role: 'user',
          content: `Tags: ${projectTags.map((t) => t.name).join(', ')}\n\nFeedback: ${text.slice(0, 2000)}`,
        },
      ],
      json: true,
      temperature: 0,
    })
    const parsed = JSON.parse(raw) as unknown
    const names = (Array.isArray(parsed) ? parsed : []).map((n) => String(n).toLowerCase())
    const picked = projectTags.filter((t) => names.includes(t.name.toLowerCase()))
    return picked.length > 0 ? picked : deterministic()
  } catch {
    return deterministic()
  }
}

/**
 * Smart-reply draft (Phase 20): a suggested admin reply to a post. Templated fallback uses the
 * post's title/status/votes; the LLM writes a warmer, context-aware reply when enabled.
 */
export async function draftReply(provider: LLMProvider, postId: string): Promise<string> {
  const [post] = await db
    .select({
      title: posts.title,
      body: posts.body,
      voteCount: posts.voteCount,
      statusName: statuses.name,
    })
    .from(posts)
    .leftJoin(statuses, eq(statuses.id, posts.statusId))
    .where(eq(posts.id, postId))
  if (!post) return ''
  const status = post.statusName ?? 'open'

  if (!provider.enabled) {
    return (
      `Thanks for raising “${post.title}” — and for the ${post.voteCount} ` +
      `${post.voteCount === 1 ? 'vote' : 'votes'} behind it. ` +
      `It’s currently marked ${status}. We’ll share an update here as it moves forward. ` +
      `Anything else you’d want this to cover?`
    )
  }
  const thread = await db
    .select({ body: comments.body })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.isInternal, false)))
    .limit(20)
  return provider.complete({
    system:
      'You are a friendly product manager replying publicly to a customer feedback post. Write a warm, specific 2-4 sentence reply. Do not over-promise dates.',
    messages: [
      {
        role: 'user',
        content: `Title: ${post.title}\nBody: ${post.body}\nStatus: ${status}\nVotes: ${post.voteCount}\nComments:\n${thread.map((c) => `- ${c.body}`).join('\n')}`,
      },
    ],
  })
}

export type WeeklyDigest = {
  since: string
  newPosts: number
  newVotes: number
  topVoted: { id: string; title: string; voteCount: number }[]
  shipped: { id: string; title: string }[]
  sentiment: { positive: number; neutral: number; negative: number }
  narrative: string
  aiEnabled: boolean
}

/**
 * Weekly digest (Phase 20): "what your users asked for this week", composed deterministically
 * from the last 7 days of activity. The LLM adds a one-paragraph narrative when enabled; without
 * it we generate a sensible template narrative.
 */
export async function buildWeeklyDigest(
  provider: LLMProvider,
  projectId: string,
): Promise<WeeklyDigest> {
  const since = sql`now() - interval '7 days'`
  const live = and(
    eq(posts.projectId, projectId),
    isNull(posts.mergedIntoPostId),
    isNull(posts.hiddenAt),
    eq(posts.reviewStatus, 'none'),
  )

  const [counts] = await db
    .select({
      newPosts: sql<number>`count(*) filter (where ${gte(posts.createdAt, since)})::int`,
      pos: sql<number>`count(*) filter (where ${posts.sentimentLabel} = 'positive')::int`,
      neu: sql<number>`count(*) filter (where ${posts.sentimentLabel} = 'neutral')::int`,
      neg: sql<number>`count(*) filter (where ${posts.sentimentLabel} = 'negative')::int`,
    })
    .from(posts)
    .where(live)

  const [voteRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(votes)
    .innerJoin(posts, eq(posts.id, votes.postId))
    .where(and(eq(posts.projectId, projectId), gte(votes.createdAt, since)))

  const topVoted = await db
    .select({ id: posts.id, title: posts.title, voteCount: posts.voteCount })
    .from(posts)
    .where(and(live, gte(posts.createdAt, since)))
    .orderBy(desc(posts.voteCount))
    .limit(5)

  const shipped = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .innerJoin(statuses, eq(statuses.id, posts.statusId))
    .where(
      and(
        eq(posts.projectId, projectId),
        eq(statuses.kind, 'complete'),
        gte(posts.updatedAt, since),
      ),
    )
    .orderBy(desc(posts.updatedAt))
    .limit(5)

  const sentiment = {
    positive: Number(counts?.pos ?? 0),
    neutral: Number(counts?.neu ?? 0),
    negative: Number(counts?.neg ?? 0),
  }
  const newPosts = Number(counts?.newPosts ?? 0)
  const newVotes = Number(voteRow?.n ?? 0)

  let narrative = ''
  if (provider.enabled) {
    try {
      narrative = (
        await provider.complete({
          system:
            'Write a 2-3 sentence upbeat weekly summary for a product team from these feedback stats. Be specific, no fluff.',
          messages: [
            {
              role: 'user',
              content: `New posts: ${newPosts}, new votes: ${newVotes}. Top requests: ${topVoted
                .map((p) => p.title)
                .join('; ')}. Shipped: ${shipped.map((p) => p.title).join('; ') || 'none'}.`,
            },
          ],
        })
      ).trim()
    } catch {
      narrative = ''
    }
  }
  if (!narrative) {
    const lead = topVoted[0]
    narrative =
      newPosts === 0
        ? 'A quiet week — no new feedback came in.'
        : `${newPosts} new ${newPosts === 1 ? 'post' : 'posts'} and ${newVotes} ${
            newVotes === 1 ? 'vote' : 'votes'
          } this week.${lead ? ` Most wanted: “${lead.title}”.` : ''}${
            shipped.length ? ` You shipped ${shipped.length}.` : ''
          }`
  }

  return {
    since: '7d',
    newPosts,
    newVotes,
    topVoted,
    shipped,
    sentiment,
    narrative,
    aiEnabled: provider.enabled,
  }
}
