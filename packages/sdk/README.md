# @chorala/sdk (MIT)

A fully-typed TypeScript client for the [Chorala](https://chorala.com) API. Paths, query
params, request bodies and responses are all inferred from the OpenAPI spec — a thin,
zero-config wrapper over [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/).

```ts
import { createChoralaClient } from '@chorala/sdk'

// Public / widget endpoints — project public key
const chorala = createChoralaClient({ publicKey: 'pk_live_xxx' })

const { data } = await chorala.GET('/public/boards', {
  params: { query: { sort: 'top' } },
})

await chorala.POST('/public/posts', {
  body: { boardSlug: 'feature-requests', title: 'Dark mode', body: 'please 🙏' },
})

// Admin endpoints — hk_ API key
const admin = createChoralaClient({ apiKey: 'hk_live_xxx' })
const projects = await admin.GET('/projects')
```

Options: `baseUrl` (default `https://chorala.com/api/v1`), `publicKey` (`pk_…`),
`apiKey` (`hk_…`), `endUserToken` (host-signed SSO JWT), `fetch`.

## Regenerating types

The types in `src/schema.ts` are generated from the live spec. To refresh after API changes:

```bash
curl https://chorala.com/api/v1/openapi.json -o packages/sdk/openapi.json
pnpm --filter @chorala/sdk generate
```

The full API reference is at [`/docs`](https://chorala.com/docs) and
[`docs/API.md`](../../docs/API.md).
