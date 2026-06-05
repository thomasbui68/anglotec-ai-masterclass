/**
 * Playwright E2E Configuration
 *
 * Runs critical user flows (login, flashcards, payment) on every
 * deployment to catch bugs before they reach production.
 *
 * Tests run against:
 *   — Chromium (Chrome/Edge)
 *   — Firefox
 *   — WebKit (Safari)
 *
 * This cross-browser matrix is what caught the Safari Face ID bug.
 */

import { defineConfig, devices } from "@playwright/test";

// Use the dev server for local runs, env var for CI
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",

  // Run tests in all 3 browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          // Allow localStorage access in headless mode
          bypassCSP: true,
        },
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Each test gets its own browser context (isolated cookies/localStorage)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Ensure localStorage is available
    launchOptions: {
      args: ["--disable-features=IsolateOrigins,site-per-process"],
    },
  },

  // Dev server auto-starts for local runs
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
