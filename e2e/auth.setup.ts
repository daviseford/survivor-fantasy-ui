import { expect, test as setup } from "@playwright/test";
import dotenv from "dotenv";

// Use override: true so .env values take precedence over system env vars.
// On Windows, USERNAME is a built-in system variable (the Windows login name),
// which would shadow the email address in .env without override.
dotenv.config({ override: true });

setup("authenticate as admin", async ({ page }) => {
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Missing USERNAME or PASSWORD in .env file. " +
        "Create a .env at the project root with USERNAME=<email> and PASSWORD=<password>.",
    );
  }

  // Navigate to the app
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click the Login button in the navbar to open the AuthModal
  await page.locator("nav button", { hasText: "Login" }).click();

  // The AuthModal has Login and Register tabs with identical placeholders.
  // Target the first (Login) tab panel to avoid strict-mode violations.
  const loginPanel = page.locator('[role="tabpanel"]').first();
  await loginPanel
    .getByPlaceholder("hello@gmail.com")
    .waitFor({ timeout: 10_000 });

  // Fill in the login form
  await loginPanel.getByPlaceholder("hello@gmail.com").fill(username);
  await loginPanel.getByPlaceholder("Your password").fill(password);

  // Submit the form
  await loginPanel.getByRole("button", { name: "Sign in" }).click();

  // Wait for auth to settle — the Login button should disappear and be
  // replaced by user info (displayName or email) and a Logout button
  await expect(page.locator("nav button", { hasText: "Logout" })).toBeVisible({
    timeout: 15_000,
  });

  // Save signed-in state so other tests can reuse it
  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
