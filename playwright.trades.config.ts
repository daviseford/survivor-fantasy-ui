import { defineConfig, devices } from "@playwright/test";

/**
 * Live trades e2e. Unlike the read-only production suites (playwright.config.ts),
 * this config WRITES to production Firebase: it seeds two real test users and a
 * real competition (globalSetup), exercises the trades flow as both users, and
 * removes everything again (globalTeardown).
 *
 * Run with: yarn e2e:trades
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /trades\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "html",
  timeout: 90_000,

  globalSetup: "./e2e/trades.global-setup.ts",
  globalTeardown: "./e2e/trades.global-teardown.ts",

  use: {
    // Dedicated port: the regular dev server (5173) may already be running
    // another project — never reuse a server for this suite.
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "yarn dev --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
