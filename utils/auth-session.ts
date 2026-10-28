import type { APIRequestContext, Response } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { logger } from './logger';

const TOKEN_KEY = 'token';
const SESSION_CHECK_ENDPOINT = '/api/assignees';
const UNAUTHORIZED_STATUSES = [401, 403];
const TOO_MANY_REQUESTS = 429;

interface StoredState {
  origins: { localStorage: { name: string; value: string }[] }[];
}

/** Auth token saved in a storage state file, or undefined if absent or unreadable. */
export function readStoredToken(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  try {
    const state = JSON.parse(readFileSync(file, 'utf8')) as StoredState;
    return state.origins
      .flatMap((origin) => origin.localStorage)
      .find((item) => item.name === TOKEN_KEY)?.value;
  } catch (error) {
    logger.warn('Stored session is unreadable, logging in again', {
      file,
      error: String(error),
    });
    return undefined;
  }
}

/** True if the API accepts the token; throws on anything but accept or reject. */
export async function isSessionValid(
  request: APIRequestContext,
  token: string,
): Promise<boolean> {
  const response = await request.get(SESSION_CHECK_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.ok()) return true;
  const status = response.status();
  if (UNAUTHORIZED_STATUSES.includes(status)) {
    logger.warn('Stored session rejected by the API', { status });
    return false;
  }
  const body = await response.text();
  logger.error('Session check failed', { status, body });
  throw new Error(`GET ${SESSION_CHECK_ENDPOINT} returned ${status}: ${body}`);
}

/** Throws with the status, body and, on 429, the retry delay if login failed. */
export async function assertLoginSucceeded(response: Response): Promise<void> {
  if (response.ok()) return;
  const status = response.status();
  const body = await response.text();
  const headers = response.headers();
  const retryAfter = headers['retry-after'] ?? headers['ratelimit-reset'];
  const hint =
    status === TOO_MANY_REQUESTS
      ? ` Login rate limit reached, retry in ${retryAfter ?? 'unknown'} s.`
      : '';
  logger.error('Login failed', { status, body, retryAfter });
  throw new Error(
    `POST ${new URL(response.url()).pathname} returned ${status}.${hint}`,
  );
}
