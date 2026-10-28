import type { Browser } from '@playwright/test';
import { test as base } from '@playwright/test';
import path from 'node:path';
import { ADMIN } from '../config/test-data';
import { LoginPage } from '../pages/LoginPage';
import {
  assertLoginSucceeded,
  isSessionValid,
  readStoredToken,
} from '../utils/auth-session';
import { logger } from '../utils/logger';
import { resetEnvironment } from '../utils/reset-data';

interface TestFixtures {
  /** Resets the environment after every test, even a failed one. */
  resetDataAfterTest: void;
}

interface WorkerFixtures {
  /** Reuses the saved admin session, or logs in once per worker. */
  workerStorageState: string;
}

/** Logs in through the UI and saves the session to the file. */
async function loginAndSaveSession(
  browser: Browser,
  baseURL: string | undefined,
  file: string,
): Promise<void> {
  const page = await browser.newPage({ baseURL, storageState: undefined });
  try {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await assertLoginSucceeded(await loginPage.login(ADMIN));
    await page.waitForURL(/\/policies$/);
    await page.context().storageState({ path: file });
    logger.info('Saved admin session', { file });
  } catch (error) {
    logger.error('Admin login failed', { baseURL, error: String(error) });
    throw error;
  } finally {
    await page.close();
  }
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  /** Gives every test the worker session as its storage state. */
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerStorageState: [
    async ({ browser, playwright }, use, workerInfo) => {
      const { baseURL } = workerInfo.project.use;
      const file = path.resolve('.auth', `admin-${workerInfo.parallelIndex}.json`);
      const token = readStoredToken(file);
      const api = await playwright.request.newContext({ baseURL });
      try {
        if (token && (await isSessionValid(api, token))) {
          logger.info('Reusing saved admin session', { file });
        } else {
          await loginAndSaveSession(browser, baseURL, file);
        }
      } finally {
        await api.dispose();
      }
      await use(file);
    },
    { scope: 'worker' },
  ],

  resetDataAfterTest: [
    async ({ request, workerStorageState }, use) => {
      await use();
      const token = readStoredToken(workerStorageState);
      if (!token) {
        logger.error('No session token for reset', { file: workerStorageState });
        throw new Error(`No auth token in ${workerStorageState}; cannot reset data.`);
      }
      await resetEnvironment(request, token);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
