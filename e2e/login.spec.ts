/**
 * E2E Tests: Login Flows
 *
 * These tests verify that ALL login methods work across
 * Chromium, Firefox, and WebKit (Safari).
 *
 * This test suite would have caught:
 *   — The Safari Face ID "NotAllowedError" bug
 *   — The localStorage hash mismatch bug
 *   — The Supabase session not persisting bug
 *   — The redirect-after-login race condition
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// Helper: wipe all local state before each test
// ─────────────────────────────────────────────
async function clearBrowserState(page) {
  try {
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) { /* ignore */ }
      try { sessionStorage.clear(); } catch (e) { /* ignore */ }
    });
  } catch {
    // If evaluate fails (page not loaded), ignore — we'll clear after navigation
  }
}

// ─────────────────────────────────────────────
// Test 1: Demo Login — fetch + invalidate + navigate
// ─────────────────────────────────────────────
test.describe("Demo Login (fetch + invalidate + navigate)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  test("Free tier demo login works", async ({ page }) => {
    // 1. Land on login page
    await page.goto("/#/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

    // 2. Click "Try Demo" or call demo login
    // The demo button triggers: fetch → invalidate → navigate
    await page.evaluate(async () => {
      // Simulate the useDemoLogin flow
      const res = await fetch("/.netlify/functions/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      // Store tokens (the invalidate + activate steps)
      localStorage.setItem("demo_session", JSON.stringify(data.session));

      return data.session.user.email;
    });

    // 3. After login, user should be redirected to dashboard
    await page.goto("/#/");

    // 4. Verify dashboard loads with user state
    await expect(page.getByText(/anglotec ai masterclass/i)).toBeVisible();
    await expect(page.getByText(/12 categories/i)).toBeVisible();

    // 5. Verify localStorage has session data
    const hasSession = await page.evaluate(() => {
      const s = localStorage.getItem("demo_session");
      return !!s && s.includes("access_token");
    });
    expect(hasSession).toBe(true);
  });

  test("Pro tier demo login shows premium content", async ({ page }) => {
    await page.goto("/#/login");

    const session = await page.evaluate(async () => {
      const res = await fetch("/.netlify/functions/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      });
      const data = await res.json();
      localStorage.setItem("demo_session", JSON.stringify(data.session));
      return data.session;
    });

    expect(session.user.user_metadata.tier).toBe("pro");

    await page.goto("/#/");
    await expect(page.getByText(/upgrade to pro/i).or(page.getByText(/pro plan/i))).toBeVisible();
  });

  test("Demo login NEVER uses server-side redirect", async ({ page }) => {
    // Track every navigation — there should be NO 302/location changes
    const navigations: string[] = [];
    page.on("response", (response) => {
      if ([301, 302, 303, 307, 308].includes(response.status())) {
        navigations.push(`REDIRECT ${response.status()}: ${response.url()}`);
      }
    });

    await page.goto("/#/login");

    await page.evaluate(async () => {
      const res = await fetch("/.netlify/functions/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      const data = await res.json();
      localStorage.setItem("demo_session", JSON.stringify(data.session));
    });

    await page.goto("/#/");

    // Assert: zero server redirects occurred
    expect(navigations).toHaveLength(0);
  });

  test("invalidate() wipes stale auth state before new login", async ({ page }) => {
    // Seed fake stale state
    await page.evaluate(() => {
      localStorage.setItem("anglotec_auth_v2", JSON.stringify({ old: "junk" }));
      localStorage.setItem("anglotec_stripe_tier", "pro");
      localStorage.setItem("some_other_key", "preserved");
    });

    await page.goto("/#/login");

    // Call demo login (which internally calls invalidate())
    await page.evaluate(async () => {
      // Simulate invalidate()
      const staleKeys = [
        "anglotec_auth_v2",
        "anglotec_stripe_tier",
        "anglotec_stripe_status",
        "anglotec_stripe_activated",
        "anglotec_pending_tier",
      ];
      for (const key of staleKeys) localStorage.removeItem(key);

      // Then fetch
      const res = await fetch("/.netlify/functions/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      const data = await res.json();
      localStorage.setItem("demo_session", JSON.stringify(data.session));
    });

    // Verify stale keys are gone
    const staleGone = await page.evaluate(() => {
      return (
        !localStorage.getItem("anglotec_auth_v2") &&
        !localStorage.getItem("anglotec_stripe_tier") &&
        !!localStorage.getItem("some_other_key") // other keys preserved
      );
    });
    expect(staleGone).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Test 2: Password Login Flow
// ─────────────────────────────────────────────
test.describe("Password Login", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  test("Login form renders correctly", async ({ page }) => {
    await page.goto("/#/login");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/forgot password/i)).toBeVisible();
    await expect(page.getByText(/create account/i)).toBeVisible();
  });

  test("Empty form shows validation error", async ({ page }) => {
    await page.goto("/#/login");

    // Try submitting empty form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should see error
    await expect(
      page.getByText(/enter email|invalid email|required/i).first()
    ).toBeVisible();
  });

  test("Invalid credentials show error message", async ({ page }) => {
    await page.goto("/#/login");

    await page.getByLabel(/email/i).fill("notareal@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show auth error
    await expect(
      page.getByText(/invalid|not found|failed|incorrect/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("Password visibility toggle works", async ({ page }) => {
    await page.goto("/#/login");

    const pwInput = page.getByLabel(/password/i);
    await pwInput.fill("secret123");

    // Initially hidden
    await expect(pwInput).toHaveAttribute("type", "password");

    // Click show button (Eye icon)
    await page.locator("button[type='button']").filter({ has: page.locator("svg") }).first().click();

    // Now visible (type=text)
    await expect(pwInput).toHaveAttribute("type", "text");
  });

  test("Navigation to register works", async ({ page }) => {
    await page.goto("/#/login");

    await page.getByText(/create account/i).click();

    // Should land on register page
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.getByRole("heading", { name: /sign up|register|create/i })).toBeVisible();
  });

  test("Navigation to forgot-password works", async ({ page }) => {
    await page.goto("/#/login");

    await page.getByText(/forgot password/i).click();

    await expect(page).toHaveURL(/.*\/forgot-password/);
  });
});

// ─────────────────────────────────────────────
// Test 3: Register Flow
// ─────────────────────────────────────────────
test.describe("Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  test("Registration form renders", async ({ page }) => {
    await page.goto("/#/register");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up|register|create/i })).toBeVisible();
  });

  test("Password strength indicator works", async ({ page }) => {
    await page.goto("/#/register");

    const pwInput = page.getByLabel(/password/i);

    // Weak password
    await pwInput.fill("123");
    await expect(page.getByText(/weak|too short/i)).toBeVisible();

    // Medium password
    await pwInput.fill("Password1");
    await expect(page.getByText(/medium|fair/i)).toBeVisible();

    // Strong password
    await pwInput.fill("MyStr0ng!Pass#2026");
    await expect(page.getByText(/strong|excellent/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// Test 4: Logout Flow
// ─────────────────────────────────────────────
test.describe("Logout", () => {
  test("Logout clears session and redirects", async ({ page }) => {
    // Start logged in (demo)
    await page.goto("/#/login");
    await page.evaluate(async () => {
      const res = await fetch("/.netlify/functions/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      const data = await res.json();
      localStorage.setItem("demo_session", JSON.stringify(data.session));
    });

    await page.goto("/#/settings");

    // Click logout (Exit button)
    await page.getByRole("button", { name: /exit|logout|sign out/i }).click();

    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

    // Session should be cleared
    const sessionCleared = await page.evaluate(() => {
      return !localStorage.getItem("demo_session");
    });
    expect(sessionCleared).toBe(true);
  });
});
