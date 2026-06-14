#!/usr/bin/env -S npx tsx
import { createServer as createHttpServer } from 'node:http'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from './client.ts'
import { createServer } from './server.ts'

const apiUrl = process.env.CHORALA_API_URL ?? 'http://localhost:8787'
const apiKey = process.env.CHORALA_MCP_API_KEY ?? process.env.CHORALA_API_KEY
if (!apiKey) {
  console.error('Set CHORALA_MCP_API_KEY to a Chorala admin API key (hk_...).')
  process.exit(1)
}

const client = createClient({ apiUrl, apiKey })
const server = createServer(client)

if (process.env.CHORALA_MCP_TRANSPORT === 'http') {
  // Streamable HTTP transport (for remote clients).
  const port = Number(process.env.CHORALA_MCP_PORT ?? '8788')
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  createHttpServer((req, res) => transport.handleRequest(req, res)).listen(port, () => {
    console.error(`chorala-mcp listening on http://localhost:${port} (streamable HTTP)`)
  })
} else {
  // stdio transport (for local Claude Desktop / Claude Code / Cursor).
  await server.connect(new StdioServerTransport())
  console.error('chorala-mcp ready on stdio')
}
