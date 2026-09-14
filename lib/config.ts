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
};

/** Reads the configuration. A missing value throws with its own name. */
export function requiredConfig(): Config {
  return {
    account: requiredEnv("ADMIN_ACCOUNT"),
    password: requiredEnv("ADMIN_PASSWORD"),
    sessionSecret: requiredEnv("SESSION_SECRET"),
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}
