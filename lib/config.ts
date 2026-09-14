/**
 * The environment the application is configured with. `instrumentation.ts` reads it
 * once when the server starts and `lib/auth.ts` reads it when it needs it, so the
 * variable names live here alone.
 */

export type Config = {
  /** The one account that can sign in. */
  account: string;
  /** The password that account signs in with. */
  password: string;
  /** The secret the session token is signed with. */
  sessionSecret: string;
  /** How long an issued session stays valid, in milliseconds. */
  sessionLifetimeMs: number;
};

/** How long a session lasts when nothing overrides it: eight hours. */
const DEFAULT_SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

/** Reads the configuration. A missing value throws with its own name. */
export function requiredConfig(): Config {
  return {
    account: requiredEnv("ADMIN_ACCOUNT"),
    password: requiredEnv("ADMIN_PASSWORD"),
    sessionSecret: requiredEnv("SESSION_SECRET"),
    sessionLifetimeMs: sessionLifetimeMs(),
  };
}

/**
 * How long a session lasts. `SESSION_TTL_SECONDS` shortens it, which is what lets the
 * end-to-end test watch a session expire instead of waiting eight hours for one to.
 */
function sessionLifetimeMs(): number {
  const seconds = process.env.SESSION_TTL_SECONDS;
  if (!seconds) return DEFAULT_SESSION_LIFETIME_MS;

  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`SESSION_TTL_SECONDS must be a positive number of seconds, but it is "${seconds}".`);
  }

  return parsed * 1000;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}
