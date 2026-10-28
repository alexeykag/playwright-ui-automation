import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const TEST_ENV_FILE = '.env.test';
const DEFAULT_BASE_URL = 'http://localhost:3000';

if (existsSync(TEST_ENV_FILE)) process.loadEnvFile(TEST_ENV_FILE);

const baseURL = process.env.BASE_URL ?? DEFAULT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
