import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test configuration for VibeCode
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests serially for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for database consistency
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Default timeout for actions
    actionTimeout: 10000,
    // Navigation timeout
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Run local dev server before tests (only when not in CI)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'cd .. && pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
