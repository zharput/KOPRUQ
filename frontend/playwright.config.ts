import { defineConfig, devices } from '@playwright/test'
import { E2E_API_BASE, E2E_BASE_URL } from './e2e/support/env.ts'

/**
 * Playwright e2e for the manual scenarios in docs/e2e. Prerequisites: backend (default http://localhost:8080) and its
 * PostgreSQL are already running (see docs/e2e/README.md); only the Vite dev server is started (or reused) here.
 * One worker: all specs share one real database.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: E2E_BASE_URL,
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: E2E_BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    // Only effective when Playwright starts Vite itself; an already running dev server keeps its own VITE_API_BASE.
    env: process.env.E2E_API_BASE ? { VITE_API_BASE: E2E_API_BASE } : {},
  },
})
