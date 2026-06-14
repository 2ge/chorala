import { db, desc, eq, feedbackClusters, posts, sql, votes } from '@chorala/db'
import type { AnalyticsQuery } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { postColumns } from './posts.ts'
import { getProject } from './projects.ts'

const TIMEFRAME_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null }

export async function getAnalytics(ctx: AuthContext, projectId: string, query: AnalyticsQuery) {
  await getProject(ctx, projectId)

  const topPostsRows = await db
    .select(postColumns)
    .from(posts)
    .where(eq(posts.projectId, projectId))
    .orderBy(desc(posts.voteCount))
    .limit(10)

  const days = TIMEFRAME_DAYS[query.timeframe] ?? null
  const sinceClause = days
    ? sql`and ${votes.createdAt} >= now() - (${days} * interval '1 day')`
    : sql``
  const velocity = await db.execute<{ date: string; votes: number }>(
    sql`select to_char(date_trunc('day', ${votes.createdAt}), 'YYYY-MM-DD') as date,
               count(*)::int as votes
        from ${votes}
        join ${posts} on ${posts.id} = ${votes.postId}
        where ${posts.projectId} = ${projectId} ${sinceClause}
        group by 1 order by 1`,
  )

  const clusters = await db
    .select({
      label: feedbackClusters.label,
      summary: feedbackClusters.summary,
      postIds: feedbackClusters.postIds,
    })
    .from(feedbackClusters)
    .where(eq(feedbackClusters.projectId, projectId))

  return {
    topPosts: topPostsRows.map((post) => ({ post, voteCount: post.voteCount })),
    voteVelocity: Array.from(velocity).map((r) => ({ date: r.date, votes: r.votes })),
    clusterThemes: clusters.map((c) => ({
      label: c.label,
      summary: c.summary,
      count: c.postIds.length,
    })),
  }
}
