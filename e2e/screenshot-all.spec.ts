import { expect, test } from "@playwright/test";

import { ALL_ROUTES } from "./helpers";

/**
 * Screenshot every route in the app.
 *
 * SAFETY: These tests are READ-ONLY -- they only navigate and take screenshots.
 * No data is ever created, updated, or deleted.
 */
for (const route of ALL_ROUTES) {
  test(`screenshot ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    // Give transitions and lazy-loaded data a moment to settle
    await page.waitForTimeout(2_000);

    // Verify the page loaded (didn't get a blank white screen)
    await expect(page.locator("body")).not.toBeEmpty();

    await page.screenshot({
      path: `e2e/screenshots/${route.name}.png`,
      fullPage: true,
    });
  });
}
