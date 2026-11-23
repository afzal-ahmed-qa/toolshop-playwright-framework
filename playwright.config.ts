import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

const isCI = !!process.env.CI;

/**
 * Projects:
 *   setup     logs in once per role through the API and saves the browser state
 *   api       API tests, no browser
 *   chromium  UI tests; depend on setup so the saved logins exist
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['list'], ['blob']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/ },
    { name: 'api', testDir: './tests/api' },
    {
      name: 'chromium',
      testIgnore: [/tests\/api\//, /tests\/setup\//],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
