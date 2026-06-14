import { type NextRequest, NextResponse } from 'next/server'

/** Hosts that serve the admin app + /portal/[id]. Anything else is a project custom
 *  domain (e.g. feedback.musicaha.com) and is rewritten to the host-resolved portal. */
const ADMIN_HOSTS = new Set([
  'chorala.com',
  'www.chorala.com',
  'idea.2pu.net',
  'localhost',
  '127.0.0.1',
])

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0] ?? ''
  if (ADMIN_HOSTS.has(host)) return NextResponse.next()

  const url = req.nextUrl.clone()
  if (url.pathname.startsWith('/site')) return NextResponse.next()
  url.pathname = `/site${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|widget.js|api).*)'],
}
