import { expect, test } from '@playwright/test'

const ADMIN = { email: 'admin@chorala.com', password: 'choraladmin123' }

/**
 * SPEC §13 end-to-end journey:
 *   submit idea via the widget/public API → appears on the board → vote →
 *   admin changes its status → it shows on the public roadmap.
 */
test('feedback journey: submit → board → vote → triage → roadmap', async ({ page, request }) => {
  const base = test.info().project.use.baseURL as string

  // --- Admin signs in ---
  await page.goto('/login')
  await page.fill('input[type="password"]', ADMIN.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/admin\/[^/]+\/posts/)
  const projectId = page.url().match(/admin\/([^/]+)\/posts/)?.[1]
  expect(projectId).toBeTruthy()

  // --- Discover the project public key from settings ---
  await page.goto(`/admin/${projectId}/settings`)
  const publicKey = (await page.locator('code').first().innerText()).trim()
  expect(publicKey).toMatch(/^pk_/)

  // --- Submit an idea via the public API (what the widget does), then vote ---
  const title = `E2E idea ${Date.now()}`
  const created = await request.post(`${base}/api/v1/public/posts`, {
    headers: { 'x-heed-key': publicKey, 'content-type': 'application/json' },
    data: { boardSlug: 'feature-requests', title, body: 'created by the e2e test' },
  })
  expect(created.ok()).toBeTruthy()
  const postId = ((await created.json()) as { post: { id: string } }).post.id

  const voteRes = await request.post(`${base}/api/v1/public/posts/${postId}/vote`, {
    headers: { 'x-heed-key': publicKey },
  })
  expect(((await voteRes.json()) as { voteCount: number }).voteCount).toBeGreaterThan(0)

  // --- It appears on the admin board ---
  await page.goto(`/admin/${projectId}/posts`)
  await expect(page.getByRole('link', { name: title })).toBeVisible()

  // --- Admin opens it and moves it to a roadmap status ---
  await page.getByRole('link', { name: title }).click()
  await page.waitForURL(/\/posts\/post_/)
  await page.getByLabel('status').selectOption('In Progress')
  await page.waitForTimeout(800)

  // --- It now shows on the public roadmap under In Progress ---
  await page.goto(`/portal/${projectId}/roadmap`)
  await expect(page.getByText(title)).toBeVisible()
})
