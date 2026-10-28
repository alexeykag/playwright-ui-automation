import type { Credentials } from '../pages/LoginPage';
import { requireEnv } from '../utils/env';

export const ADMIN: Credentials = {
  username: requireEnv('ADMIN_USERNAME'),
  password: requireEnv('ADMIN_PASSWORD'),
};

export const RESET_ENDPOINT = '/api/admin/reset';
