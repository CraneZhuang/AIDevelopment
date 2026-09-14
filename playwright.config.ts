import { defineConfig, devices } from "@playwright/test";
import { TEST_ACCOUNT, TEST_PASSWORD, TEST_SESSION_SECRET } from "./tests/test-account";

// Dedicated port so a parallel worktree's dev server on 3000 cannot collide with this one.
const PORT = 3105;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The test drives the production build, so it exercises the same cookie
  // attributes and rendering the deployed app uses.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    // A real environment wins over `.env.local`, so the suite supplies its own
    // account and does not depend on the developer's untracked file.
    env: {
      ADMIN_ACCOUNT: TEST_ACCOUNT,
      ADMIN_PASSWORD: TEST_PASSWORD,
      SESSION_SECRET: TEST_SESSION_SECRET,
    },
  },
});
