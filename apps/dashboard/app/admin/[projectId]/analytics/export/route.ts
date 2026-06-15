import { analytics } from '@chorala/core'
import type { NextRequest } from 'next/server'
import { requireAuthContext } from '@/lib/session'

const TIMEFRAMES = ['7d', '30d', '90d', 'all'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const tf = req.nextUrl.searchParams.get('timeframe')
  const timeframe: Timeframe = TIMEFRAMES.includes(tf as Timeframe) ? (tf as Timeframe) : '30d'
  const csv = await analytics.exportAnalyticsCsv(ctx, projectId, { timeframe })
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="analytics-${timeframe}.csv"`,
    },
  })
}
