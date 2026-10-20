import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/** Emails the app sends during e2e land here as JSON lines. */
export const MAIL_OUTBOX = path.resolve('test-results/outbox.jsonl');

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'pnpm e2e:server',
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: 'postgresql://beanledger:beanledger@localhost:5433/beanledger_test',
      NODE_ENV: 'development',
      PORT: String(PORT),
      HOST: 'localhost',
      MAIL_TRANSPORT: 'file',
      MAIL_OUTBOX
    }
  }
});
