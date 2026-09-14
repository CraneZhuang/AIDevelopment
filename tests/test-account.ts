/**
 * The credentials the end-to-end test signs in with. The test runner passes these
 * to the app's environment, so the suite does not depend on the untracked
 * `.env.local` and stays hermetic.
 */
export const TEST_ACCOUNT = "admin";
export const TEST_PASSWORD = "123456";
export const TEST_SESSION_SECRET = "end-to-end-test-secret";
