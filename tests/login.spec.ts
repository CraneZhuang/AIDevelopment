import { expect, test, type Page } from "@playwright/test";
import { TEST_ACCOUNT, TEST_PASSWORD } from "./test-account";

// The suite starts the app with this account (see playwright.config.ts), so the test
// signs in as the configured account without depending on the untracked .env.local.
const WRONG_PASSWORD = "not-the-password";

/** The cookie that carries the session. */
const SESSION_COOKIE = "session";

test("a visitor signs in, keeps the session, and ends it", async ({ page, context }) => {
  // 1. Visiting the protected page while signed out sends the visitor to the sign-in form.
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Account")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  // 2. A wrong password is refused with a visible message, and the visitor stays on the form.
  await page.getByLabel("Account").fill(TEST_ACCOUNT);
  await page.getByLabel("Password").fill(WRONG_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /incorrect/i })).toBeVisible();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 3. The configured account with the right password lands on the protected page.
  await signIn(page);
  await expect(page).toHaveURL("/dashboard");

  // 4. The protected page names the account that signed in.
  await expect(page.getByRole("heading")).toContainText(TEST_ACCOUNT);

  // 5. Reloading the protected page keeps the visitor signed in.
  await page.reload();
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading")).toContainText(TEST_ACCOUNT);

  // 6. The session cookie is httpOnly, so a script running on the page cannot read it.
  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === SESSION_COOKIE);
  if (!sessionCookie) throw new Error("Signing in did not set a session cookie.");

  expect(sessionCookie.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain(sessionCookie.value);

  // 7. A cookie whose payload has been edited is refused, and the visitor lands on the form.
  await context.addCookies([{ ...sessionCookie, value: withEditedAccount(sessionCookie.value) }]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 8. Signing out from the protected page returns the visitor to the sign-in form.
  await signIn(page);
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 9. The protected page is out of reach again once the session has ended.
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});

async function signIn(page: Page): Promise<void> {
  await page.getByLabel("Account").fill(TEST_ACCOUNT);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * The session token with the account in its payload swapped for another, and the
 * signature left as it was: what an attacker editing the cookie can produce without
 * knowing the secret.
 */
function withEditedAccount(token: string): string {
  const [payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { account: string };
  claims.account = "somebody-else";

  return `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${signature}`;
}
