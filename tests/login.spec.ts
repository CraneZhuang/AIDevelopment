import { expect, test, type Page } from "@playwright/test";
import { TEST_ACCOUNT, TEST_PASSWORD, TEST_SESSION_LIFETIME_SECONDS } from "./test-account";

// The suite starts the app with this account (see playwright.config.ts), so the test
// signs in as the configured account without depending on the untracked .env.local.
const WRONG_PASSWORD = "not-the-password";

/** The cookie that carries the session. */
const SESSION_COOKIE = "session";

/** A cookie value this server never signed. */
const FORGED_TOKEN = "forged.token";

/**
 * How long past the suite's session lifetime the visitor waits before asking for the
 * protected page again, so that the expiry has plainly elapsed rather than being
 * imminent.
 */
const PAST_EXPIRY_MS = (TEST_SESSION_LIFETIME_SECONDS + 2) * 1000;

test("a visitor keeps a session until it ends, and is refused a stale one", async ({
  page,
  context,
}) => {
  // One journey through every criterion, so the timeout is the expiry wait plus room
  // for the steps around it rather than Playwright's default.
  test.setTimeout(PAST_EXPIRY_MS + 60_000);

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

  // 7. A cookie whose payload has been edited is refused, and the visitor lands on the
  // form. Steps 5 and 6 just showed this server accepting the session as issued, so what
  // turns the visitor away here is the edit rather than an expiry that crept up on it.
  await context.addCookies([{ ...sessionCookie, value: withEditedPayload(sessionCookie.value) }]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 8. A cookie this server never signed is refused on the same path.
  await context.addCookies([{ ...sessionCookie, value: FORGED_TOKEN }]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 9. Signing out from the protected page returns the visitor to the sign-in form.
  await signIn(page);
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 10. The protected page is out of reach again once the session has ended.
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");

  // 11. A session whose expiry has passed is refused, and the visitor lands on the form.
  // The suite issues sessions measured in seconds (see playwright.config.ts), so this
  // journey can wait out a whole one instead of the eight hours the deployed app uses.
  await signIn(page);
  await expect(page).toHaveURL("/dashboard");
  await page.waitForTimeout(PAST_EXPIRY_MS);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();
});

async function signIn(page: Page): Promise<void> {
  await page.getByLabel("Account").fill(TEST_ACCOUNT);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * The session token with a single character changed by hand: what an attacker editing
 * the cookie produces without knowing the secret. Nothing here decodes the token — what
 * it is made of stays the module's business — and the character sits in the payload for
 * a token of this shape, so the signature no longer describes what the cookie says.
 */
function withEditedPayload(token: string): string {
  const at = Math.floor(token.length / 2);
  const replacement = token[at] === "A" ? "B" : "A";

  return `${token.slice(0, at)}${replacement}${token.slice(at + 1)}`;
}
