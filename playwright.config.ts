import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60_000,

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    // Auth setup — runs first and saves storageState for other projects
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    // Desktop viewport
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        storageState: "e2e/.auth/state.json",
      },
      dependencies: ["setup"],
    },

    // Mobile viewport
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
        storageState: "e2e/.auth/state.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "yarn dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
