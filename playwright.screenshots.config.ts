import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testDir: './tests/screenshots',
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' }
});
