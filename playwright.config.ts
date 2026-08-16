import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:3001/api/sessions',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        GIRAMICHI_API_URL: 'http://localhost:3001',
        DB_FILE: 'giramichi-test.db',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        VITE_GIRAMICHI_API_URL: 'http://localhost:3001',
        GIRAMICHI_API_URL: 'http://localhost:3001',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
