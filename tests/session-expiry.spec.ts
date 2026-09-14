import { expect, test } from "@playwright/test";
import { TEST_ACCOUNT, TEST_PASSWORD, TEST_SESSION_LIFETIME_SECONDS } from "./test-account";

// The suite starts the app with a session lifetime of seconds rather than the eight
// hours the deployed app uses (see playwright.config.ts), so this test can watch a
// real session expire. The margin past the lifetime is what makes the expiry elapsed
// rather than imminent.
const PAST_EXPIRY_MS = (TEST_SESSION_LIFETIME_SECONDS + 2) * 1000;

test("an expired session is refused", async ({ page }) => {
  test.setTimeout(PAST_EXPIRY_MS + 30_000);

  // Sign in: the session is good, and the protected page shows itself.
  await page.goto("/login");
  await page.getByLabel("Account").fill(TEST_ACCOUNT);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");

  // Let the session go stale, then ask for the protected page again.
  await page.waitForTimeout(PAST_EXPIRY_MS);
  await page.goto("/dashboard");

  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();
});
