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

/** Standard API self-discovery, served on EVERY host (so a client that found any Chorala
 *  domain can discover the API): RFC 9727 api-catalog, a /.well-known/openapi.json alias,
 *  and an llms.txt for AI clients. The OpenAPI spec itself lives at /api/v1/openapi.json. */
function discovery(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  // Public origin from the proxy's forwarded headers (req.nextUrl.origin is internal).
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host
  const origin = `${proto}://${host}`
  const spec = `${origin}/api/v1/openapi.json`
  const docs = `${origin}/docs`

  if (pathname === '/.well-known/openapi.json') {
    return NextResponse.redirect(spec, 308)
  }
  if (pathname === '/.well-known/api-catalog') {
    const body = {
      linkset: [
        {
          anchor: `${origin}/api/v1`,
          'service-desc': [{ href: spec, type: 'application/json' }],
          'service-doc': [{ href: docs, type: 'text/html' }],
        },
      ],
    }
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        'content-type': 'application/linkset+json; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    })
  }
  if (pathname === '/llms.txt') {
    const txt = `# Chorala

> Open-core product-feedback platform: feedback boards, voting, public roadmap and
> changelog. Embeddable widget, multilingual, AI-native. This file helps AI clients
> discover the API.

## API
- OpenAPI 3.1 spec: ${spec}
- Interactive reference: ${docs}
- Discovery (RFC 9727): ${origin}/.well-known/api-catalog

## Auth
- Public/widget: header \`X-Chorala-Key: pk_…\` (project public key)
- Admin: \`Authorization: Bearer hk_…\` (API key) or session cookie
- End-user SSO: header \`X-Chorala-User: <HS256 JWT>\`

## Embed
- One tag: \`<script async src="${origin}/widget.js" data-chorala-key="pk_…"></script>\`
`
    return new NextResponse(txt, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    })
  }
  return null
}

export function middleware(req: NextRequest) {
  const disco = discovery(req)
  if (disco) return disco

  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0] ?? ''
  if (ADMIN_HOSTS.has(host)) return NextResponse.next()

  const url = req.nextUrl.clone()
  if (url.pathname.startsWith('/site')) return NextResponse.next()
  url.pathname = `/site${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  // Explicit entries for the discovery paths (Next skips dot/file-like paths from the
  // general matcher), plus the catch-all for the portal rewrite.
  matcher: ['/.well-known/:path*', '/llms.txt', '/((?!_next|favicon.ico|widget.js|api).*)'],
}
