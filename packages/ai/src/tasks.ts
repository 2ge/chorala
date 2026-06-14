import { loadEnv } from '@chorala/config'
import {
  aiJobs,
  and,
  comments,
  db,
  eq,
  feedbackClusters,
  inArray,
  newId,
  organizations,
  posts,
  postTranslations,
  projects,
  sql,
} from '@chorala/db'
import type { LLMProvider } from './provider.ts'

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

/** Run embed → dedup → translate for a freshly created/edited post. */
export async function processPost(provider: LLMProvider, postId: string) {
  await embedPost(provider, postId)
  const suggestions = await dedupPost(provider, postId)
  const translated = await translatePost(provider, postId)
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
