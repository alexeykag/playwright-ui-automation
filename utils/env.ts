/** Returns a required environment variable or fails with an actionable error. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}. Define it in .env.test or the shell.`);
  }
  return value;
}
