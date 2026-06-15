import {
  and,
  comments,
  db,
  desc,
  eq,
  feedbackClusters,
  isNull,
  posts,
  sql,
  votes,
} from '@chorala/db'
import type { AnalyticsQuery } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { postColumns } from './posts.ts'
import { getProject } from './projects.ts'

const TIMEFRAME_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null }

const num = (v: unknown) => Number(v ?? 0)

/**
 * Project analytics (Phase 19). Everything here is deterministic SQL aggregation over the raw
 * feedback graph — no AI required, so it works with provider=none. AI cluster themes are shown
 * when they exist (Phase 6 worker) but are never depended on.
 */
export async function getAnalytics(ctx: AuthContext, projectId: string, query: AnalyticsQuery) {
  await getProject(ctx, projectId)
  const days = TIMEFRAME_DAYS[query.timeframe] ?? null
  // `live` excludes merged + moderator-hidden + pending-review posts so the numbers match the board.
  const live = and(
    eq(posts.projectId, projectId),
    isNull(posts.mergedIntoPostId),
    isNull(posts.hiddenAt),
    eq(posts.reviewStatus, 'none'),
  )

  // --- Headline counters: totals, this window, and the previous window (for trend arrows) ---
  // `from`/`to` are day-offsets back from now; to=null means "everything since `from` days ago".
  const winCount = (col: string, from: number, to: number | null) =>
    to === null
      ? sql<number>`count(*) filter (where ${sql.raw(col)} >= now() - (${from} * interval '1 day'))::int`
      : sql<number>`count(*) filter (where ${sql.raw(col)} >= now() - (${from} * interval '1 day') and ${sql.raw(col)} < now() - (${to} * interval '1 day'))::int`

  const [postAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cur: days ? winCount('posts.created_at', days, null) : sql<number>`count(*)::int`,
      prev: days ? winCount('posts.created_at', days * 2, days) : sql<number>`0`,
    })
    .from(posts)
    .where(live)

  const voteJoin = sql`join ${posts} on ${posts.id} = ${votes.postId}
    where ${posts.projectId} = ${projectId} and ${posts.mergedIntoPostId} is null
      and ${posts.hiddenAt} is null and ${posts.reviewStatus} = 'none'`
  const [voteAgg] = Array.from(
    await db.execute<{ total: number; cur: number; prev: number; voters: number }>(sql`
      select count(*)::int as total,
        ${days ? sql`count(*) filter (where ${votes.createdAt} >= now() - (${days} * interval '1 day'))::int` : sql`count(*)::int`} as cur,
        ${days ? sql`count(*) filter (where ${votes.createdAt} >= now() - (${days * 2} * interval '1 day') and ${votes.createdAt} < now() - (${days} * interval '1 day'))::int` : sql`0`} as prev,
        count(distinct ${votes.endUserId})::int as voters
      from ${votes} ${voteJoin}`),
  )

  const [commentAgg] = Array.from(
    await db.execute<{ total: number; cur: number; prev: number }>(sql`
      select count(*)::int as total,
        ${days ? sql`count(*) filter (where ${comments.createdAt} >= now() - (${days} * interval '1 day'))::int` : sql`count(*)::int`} as cur,
        ${days ? sql`count(*) filter (where ${comments.createdAt} >= now() - (${days * 2} * interval '1 day') and ${comments.createdAt} < now() - (${days} * interval '1 day'))::int` : sql`0`} as prev
      from ${comments}
      join ${posts} on ${posts.id} = ${comments.postId}
      where ${posts.projectId} = ${projectId} and ${comments.isInternal} = false
        and ${comments.hiddenAt} is null`),
  )

  // --- Daily velocity series (votes + new posts) over the window ---
  const sinceVotes = days
    ? sql`and ${votes.createdAt} >= now() - (${days} * interval '1 day')`
    : sql``
  const voteVelocity = Array.from(
    await db.execute<{ date: string; votes: number }>(sql`
      select to_char(date_trunc('day', ${votes.createdAt}), 'YYYY-MM-DD') as date, count(*)::int as votes
      from ${votes} join ${posts} on ${posts.id} = ${votes.postId}
      where ${posts.projectId} = ${projectId} ${sinceVotes}
      group by 1 order by 1`),
  ).map((r) => ({ date: r.date, votes: num(r.votes) }))

  const sincePosts = days
    ? sql`and ${posts.createdAt} >= now() - (${days} * interval '1 day')`
    : sql``
  const postVelocity = Array.from(
    await db.execute<{ date: string; posts: number }>(sql`
      select to_char(date_trunc('day', ${posts.createdAt}), 'YYYY-MM-DD') as date, count(*)::int as posts
      from ${posts}
      where ${posts.projectId} = ${projectId} and ${posts.mergedIntoPostId} is null
        and ${posts.hiddenAt} is null and ${posts.reviewStatus} = 'none' ${sincePosts}
      group by 1 order by 1`),
  ).map((r) => ({ date: r.date, posts: num(r.posts) }))

  // --- Status distribution (by status kind) ---
  const statusDistribution = Array.from(
    await db.execute<{ kind: string; name: string; color: string; count: number }>(sql`
      select s.kind, s.name, s.color, count(p.id)::int as count
      from statuses s
      left join posts p on p.status_id = s.id and p.merged_into_post_id is null
        and p.hidden_at is null and p.review_status = 'none'
      where s.project_id = ${projectId}
      group by s.id, s.kind, s.name, s.color, s.position
      order by s.position`),
  ).map((r) => ({ kind: r.kind, name: r.name, color: r.color, count: num(r.count) }))

  // --- Board health: per board, posts by status kind + total votes ---
  const boardHealth = Array.from(
    await db.execute<{
      board_id: string
      name: string
      total: number
      open: number
      planned: number
      in_progress: number
      complete: number
      votes: number
    }>(sql`
      select b.id as board_id, b.name,
        count(p.id)::int as total,
        count(p.id) filter (where s.kind = 'open')::int as open,
        count(p.id) filter (where s.kind = 'planned')::int as planned,
        count(p.id) filter (where s.kind = 'in_progress')::int as in_progress,
        count(p.id) filter (where s.kind = 'complete')::int as complete,
        coalesce(sum(p.vote_count), 0)::int as votes
      from boards b
      left join posts p on p.board_id = b.id and p.merged_into_post_id is null
        and p.hidden_at is null and p.review_status = 'none'
      left join statuses s on s.id = p.status_id
      where b.project_id = ${projectId}
      group by b.id, b.name, b.position
      order by b.position`),
  ).map((r) => ({
    boardId: r.board_id,
    name: r.name,
    total: num(r.total),
    open: num(r.open),
    planned: num(r.planned),
    inProgress: num(r.in_progress),
    complete: num(r.complete),
    votes: num(r.votes),
  }))

  // --- Top tags by volume ---
  const topTags = Array.from(
    await db.execute<{ name: string; color: string; count: number }>(sql`
      select t.name, t.color, count(pt.post_id)::int as count
      from tags t join post_tags pt on pt.tag_id = t.id
      join posts p on p.id = pt.post_id and p.merged_into_post_id is null and p.hidden_at is null
      where t.project_id = ${projectId}
      group by t.id, t.name, t.color
      order by count desc limit 12`),
  ).map((r) => ({ name: r.name, color: r.color, count: num(r.count) }))

  // --- Top requests by votes ---
  const topPostsRows = await db
    .select(postColumns)
    .from(posts)
    .where(live)
    .orderBy(desc(posts.voteCount))
    .limit(8)

  // --- Top requests by revenue impact (Σ distinct voter-company MRR) ---
  const topByRevenue = Array.from(
    await db.execute<{ id: string; title: string; revenue: number; vote_count: number }>(sql`
      select p.id, p.title, p.vote_count,
        coalesce((
          select sum(t.mrr)::int from (
            select distinct c.id, c.mrr from votes v
            join end_users eu on v.end_user_id = eu.id
            join companies c on eu.company_id = c.id
            where v.post_id = p.id
          ) t
        ), 0) as revenue
      from posts p
      where p.project_id = ${projectId} and p.merged_into_post_id is null
        and p.hidden_at is null and p.review_status = 'none'
      order by revenue desc, p.vote_count desc limit 8`),
  )
    .map((r) => ({
      id: r.id,
      title: r.title,
      revenue: num(r.revenue),
      voteCount: num(r.vote_count),
    }))
    .filter((r) => r.revenue > 0)

  // --- Most-evidenced requests (Phase 19 insight linking) ---
  const mostEvidenced = Array.from(
    await db.execute<{ id: string; title: string; insight_count: number }>(sql`
      select p.id, p.title, count(i.id)::int as insight_count
      from posts p join insights i on i.post_id = p.id
      where p.project_id = ${projectId}
      group by p.id, p.title
      order by insight_count desc limit 8`),
  ).map((r) => ({ id: r.id, title: r.title, insightCount: num(r.insight_count) }))

  const clusters = await db
    .select({
      label: feedbackClusters.label,
      summary: feedbackClusters.summary,
      postIds: feedbackClusters.postIds,
    })
    .from(feedbackClusters)
    .where(eq(feedbackClusters.projectId, projectId))

  return {
    summary: {
      posts: num(postAgg?.total),
      votes: num(voteAgg?.total),
      comments: num(commentAgg?.total),
      voters: num(voteAgg?.voters),
      newPosts: num(postAgg?.cur),
      newVotes: num(voteAgg?.cur),
      newComments: num(commentAgg?.cur),
      prevPosts: num(postAgg?.prev),
      prevVotes: num(voteAgg?.prev),
      prevComments: num(commentAgg?.prev),
    },
    voteVelocity,
    postVelocity,
    statusDistribution,
    boardHealth,
    topTags,
    topPosts: topPostsRows.map((post) => ({ post, voteCount: post.voteCount })),
    topByRevenue,
    mostEvidenced,
    clusterThemes: clusters.map((c) => ({
      label: c.label,
      summary: c.summary,
      count: c.postIds.length,
    })),
  }
}

/** Flatten the analytics summary + board health into a CSV report (admin export). */
export async function exportAnalyticsCsv(
  ctx: AuthContext,
  projectId: string,
  query: AnalyticsQuery,
): Promise<string> {
  const a = await getAnalytics(ctx, projectId, query)
  const cell = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = []
  lines.push(`Chorala analytics — ${query.timeframe}`)
  lines.push('')
  lines.push('Metric,Total,This window,Previous window')
  lines.push(
    ['Posts', a.summary.posts, a.summary.newPosts, a.summary.prevPosts].map(cell).join(','),
  )
  lines.push(
    ['Votes', a.summary.votes, a.summary.newVotes, a.summary.prevVotes].map(cell).join(','),
  )
  lines.push(
    ['Comments', a.summary.comments, a.summary.newComments, a.summary.prevComments]
      .map(cell)
      .join(','),
  )
  lines.push(['Active voters', a.summary.voters, '', ''].map(cell).join(','))
  lines.push('')
  lines.push('Board,Total,Open,Planned,In progress,Complete,Votes')
  for (const b of a.boardHealth) {
    lines.push(
      [b.name, b.total, b.open, b.planned, b.inProgress, b.complete, b.votes].map(cell).join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
