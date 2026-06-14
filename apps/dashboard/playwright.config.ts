import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for the SPEC §13 journey. Runs against a live stack (API + dashboard).
 * BASE_URL defaults to the deployed host; set it to your own URL to run elsewhere.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://idea.2pu.net',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
