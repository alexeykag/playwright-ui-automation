import type { APIRequestContext } from '@playwright/test';
import { RESET_ENDPOINT } from '../config/test-data';
import { logger } from './logger';

interface ResetResponse {
  message: string;
}

/** Resets the environment to defaults through the admin API as the session user. */
export async function resetEnvironment(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const response = await request.post(RESET_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    const body = await response.text();
    logger.error('Reset data failed', { status: response.status(), body });
    throw new Error(`POST ${RESET_ENDPOINT} returned ${response.status()}: ${body}`);
  }
  const { message } = (await response.json()) as ResetResponse;
  logger.info('Reset data completed', { message });
  return message;
}
