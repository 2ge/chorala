// Interactive API reference (Scalar) rendered from the generated OpenAPI spec at
// /api/v1/openapi.json. Served as a standalone HTML doc (Scalar owns the whole page),
// so it bypasses the dashboard layout. Public + indexable.
const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="index, follow" />
    <title>Chorala API Reference</title>
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="service-desc" type="application/json" href="/api/v1/openapi.json" />
    <link rel="service-doc" type="text/html" href="/docs" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.json"
      data-configuration='{"theme":"default","hideDownloadButton":false,"metaData":{"title":"Chorala API"}}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

export function GET() {
  return new Response(HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}
