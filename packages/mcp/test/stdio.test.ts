import { strict as assert } from 'node:assert'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const apiKey = process.env.CHORALA_MCP_API_KEY
if (!apiKey) {
  // Skip cleanly in CI/unit runs without a live API + key (run with CHORALA_MCP_API_KEY set).
  console.log('↷ MCP stdio test skipped (set CHORALA_MCP_API_KEY + a running API to run it).')
  process.exit(0)
}

const serverPath = fileURLToPath(new URL('../src/index.ts', import.meta.url))

const textOf = (res: { content: { type: string; text?: string }[] }) =>
  res.content.map((c) => c.text ?? '').join('')

async function main() {
  const transport = new StdioClientTransport({
    command: 'tsx',
    args: [serverPath],
    env: {
      ...process.env,
      CHORALA_MCP_API_KEY: apiKey as string,
      CHORALA_API_URL: process.env.CHORALA_API_URL ?? 'http://localhost:8787',
    },
  })
  const client = new Client({ name: 'chorala-mcp-test', version: '0.0.0' })
  await client.connect(transport)

  // 1. tools are exposed
  const { tools } = await client.listTools()
  const names = tools.map((t) => t.name)
  for (const expected of ['search_feedback', 'top_requests', 'list_boards', 'get_post']) {
    assert(names.includes(expected), `missing tool ${expected}`)
  }

  // 2. search_feedback returns seeded data
  const search = await client.callTool({
    name: 'search_feedback',
    arguments: { query: 'dark mode' },
  })
  const searchText = textOf(search as never)
  assert(
    searchText.includes('Dark mode'),
    `search_feedback did not return seeded post: ${searchText}`,
  )

  // 3. top_requests returns ranked posts
  const top = await client.callTool({ name: 'top_requests', arguments: {} })
  const ranked = JSON.parse(textOf(top as never)) as { title: string; voteCount: number }[]
  assert(ranked.length > 0, 'top_requests returned no posts')
  assert(typeof ranked[0]?.voteCount === 'number', 'top_requests missing voteCount')

  console.log(
    `✓ MCP stdio test passed — ${names.length} tools; search + top_requests return seeded data`,
  )
  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ MCP stdio test failed:', err)
  process.exit(1)
})
