import { expect, test } from "@playwright/test";

// The demo credentials documented in .env.example. The test drives the running app
// the way a person does: it types these into the form and reads what the page shows.
const ACCOUNT = "admin";
const PASSWORD = "123456";
const WRONG_PASSWORD = "not-the-password";

test("a visitor reaches the protected page with the configured account", async ({ page }) => {
  // 1. Visiting the protected page while signed out sends the visitor to the sign-in form.
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Account")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  // 2. A wrong password is refused with a visible message, and the visitor stays on the form.
  await page.getByLabel("Account").fill(ACCOUNT);
  await page.getByLabel("Password").fill(WRONG_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /incorrect/i })).toBeVisible();
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Password")).toBeVisible();

  // 3. The configured account with the right password lands on the protected page.
  await page.getByLabel("Account").fill(ACCOUNT);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");

  // 4. The protected page names the account that signed in.
  await expect(page.getByRole("heading")).toContainText(ACCOUNT);
});
