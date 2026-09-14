/**
 * The values the end-to-end suite hands the app's environment, so the suite does not
 * depend on the untracked `.env.local` and stays hermetic: the account it signs in as,
 * and the session lifetime it waits out.
 */
export const TEST_ACCOUNT = "admin";
export const TEST_PASSWORD = "123456";
export const TEST_SESSION_SECRET = "end-to-end-test-secret";

/**
 * How long the app issues sessions for while the suite runs. Seconds rather than the
 * eight hours the deployed app uses, so a test can watch a whole session expire
 * instead of waiting half a day for one to.
 */
export const TEST_SESSION_LIFETIME_SECONDS = 15;
