import { expect, test } from "@playwright/test";

import { ALL_ROUTES } from "./helpers";

/**
 * Screenshot every route in the app.
 *
 * SAFETY: These tests are READ-ONLY — they only navigate and take screenshots.
 * No data is ever created, updated, or deleted.
 */
for (const route of ALL_ROUTES) {
  test(`screenshot ${route.name} (${route.path})`, async ({ page }) => {
    // Use domcontentloaded instead of networkidle because Firebase
    // onSnapshot listeners keep the network permanently active
    await page.goto(route.path, { waitUntil: "domcontentloaded" });

    // Let Firebase data load and Mantine transitions settle
    await page.waitForTimeout(3_000);

    // Verify the page loaded (didn't get a blank white screen)
    await expect(page.locator("body")).not.toBeEmpty();

    await page.screenshot({
      path: `e2e/screenshots/${route.name}.png`,
      fullPage: true,
    });
  });
}
