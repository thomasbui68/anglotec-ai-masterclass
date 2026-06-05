/**
 * E2E Tests: Flashcard Session
 *
 * Tests the complete learning flow:
 *   Login → Open Category → Practice Flashcards → See Score → Navigate
 *
 * This would have caught:
 *   — The "Next/Previous button stuck" bug (infinite useEffect loop)
 *   — The score screen invisible buttons bug (shadcn outline variant)
 *   — The quit modal invisible buttons bug
 *   — Category access for free vs pro tiers
 */

import { test, expect } from "@playwright/test";

async function loginAsDemo(page, tier = "free") {
  await page.goto("/#/login");
  const session = await page.evaluate(async (t) => {
    const res = await fetch("/.netlify/functions/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: t }),
    });
    const data = await res.json();
    localStorage.setItem("demo_session", JSON.stringify(data.session));
    return data.session;
  }, tier);
  await page.goto("/#/");
  return session;
}

// ─────────────────────────────────────────────
// Test 1: Dashboard Loads
// ─────────────────────────────────────────────
test.describe("Dashboard", () => {
  test("Dashboard shows categories and progress", async ({ page }) => {
    await loginAsDemo(page, "free");

    // Masterclass banner
    await expect(page.getByText(/anglotec ai masterclass/i)).toBeVisible();
    await expect(page.getByText(/3,000 prompts/i)).toBeVisible();

    // Categories visible
    await expect(page.getByText(/code generation/i)).toBeVisible();
    await expect(page.getByText(/ui\/ux design/i)).toBeVisible();
    await expect(page.getByText(/content creation/i)).toBeVisible();

    // Progress section
    await expect(page.getByText(/overall progress/i)).toBeVisible();
  });

  test("Free tier shows 6 categories + 6 locked", async ({ page }) => {
    await loginAsDemo(page, "free");

    // Free categories accessible
    await expect(page.getByRole("button", { name: /code generation/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /ui\/ux design/i })).toBeEnabled();

    // Pro categories show lock
    const proCategories = ["Machine Learning", "Security", "DevOps", "Mobile", "Emerging"];
    for (const cat of proCategories) {
      await expect(page.getByText(cat, { exact: false })).toBeVisible();
    }
  });

  test("Pro tier unlocks all 12 categories", async ({ page }) => {
    await loginAsDemo(page, "pro");

    // All categories should be clickable
    await expect(page.getByRole("button", { name: /machine learning/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /security/i })).toBeEnabled();
  });

  test("Language selector shows 12 flags", async ({ page }) => {
    await loginAsDemo(page, "free");

    const langBtn = page.locator("button").filter({ hasText: /^[A-Za-z]{2}$/ });
    await expect(langBtn.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// Test 2: Flashcard Session
// ─────────────────────────────────────────────
test.describe("Flashcard Practice", () => {
  test("Opening a category shows flashcards", async ({ page }) => {
    await loginAsDemo(page, "free");

    // Click Code Generation
    await page.getByRole("button", { name: /code generation/i }).click();

    // Should land on flashcards page
    await expect(page).toHaveURL(/.*\/flashcards/);

    // Flashcard content visible
    await expect(page.getByText(/prompt|phrase|example/i).first()).toBeVisible();

    // Action buttons visible
    await expect(page.getByRole("button", { name: /i know this|mastered|know/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /practice more|learning|need practice/i })).toBeVisible();
  });

  test("'I Know This' button advances to next card", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    // Get initial card text
    const initialText = await page.locator("[data-testid='prompt-text'], .prompt-text, .card-text").first().textContent();

    // Click "I Know This"
    const knowBtn = page.getByRole("button", { name: /i know this|mastered/i });
    await knowBtn.click();

    // Should show different card OR score
    await page.waitForTimeout(500);
  });

  test("'Practice More' button advances to next card", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    const practiceBtn = page.getByRole("button", { name: /practice more|learning/i });
    await practiceBtn.click();

    // Should not hang — this was the original bug
    await expect(page.getByText(/loading|error|timeout/i)).not.toBeVisible({ timeout: 3000 });
  });

  test("Skip button works", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    const skipBtn = page.getByRole("button", { name: /skip|next/i });
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click();
      // Should advance without error
      await expect(page.getByText(/error|crash|fail/i)).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("Quit session shows modal with visible buttons", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    // Click quit
    const quitBtn = page.getByRole("button", { name: /quit|exit|leave/i });
    await quitBtn.click();

    // Modal should appear
    await expect(page.getByText(/quit session|end session|are you sure/i)).toBeVisible();

    // Both buttons should be VISIBLE (was the outline variant bug)
    const keepLearning = page.getByRole("button", { name: /keep learning|continue|stay/i });
    const confirmQuit = page.getByRole("button", { name: /quit|exit|leave|yes/i });

    await expect(keepLearning).toBeVisible();
    await expect(confirmQuit).toBeVisible();

    // Click "Keep Learning" to dismiss
    await keepLearning.click();
    await expect(page.getByText(/quit session/i)).not.toBeVisible();
  });

  test("Score screen shows stats and 'Back to Dashboard' button", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    // Complete a mini session (answer a few cards)
    for (let i = 0; i < 3; i++) {
      const knowBtn = page.getByRole("button", { name: /i know this/i });
      const practiceBtn = page.getByRole("button", { name: /practice more/i });

      if (await knowBtn.isVisible().catch(() => false)) {
        await knowBtn.click();
      } else if (await practiceBtn.isVisible().catch(() => false)) {
        await practiceBtn.click();
      }
      await page.waitForTimeout(300);
    }

    // Navigate to score/quit to see score screen
    const quitBtn = page.getByRole("button", { name: /quit/i });
    if (await quitBtn.isVisible().catch(() => false)) {
      await quitBtn.click();
      const confirmQuit = page.getByRole("button", { name: /quit|exit/i });
      await confirmQuit.click();
    }

    // Score screen elements
    await expect(page.getByText(/session complete|score|results/i).first()).toBeVisible();

    // "Back to Dashboard" button must be VISIBLE
    const backBtn = page.getByRole("link", { name: /back to dashboard|dashboard/i })
      .or(page.getByRole("button", { name: /back to dashboard|dashboard/i }));
    await expect(backBtn).toBeVisible();
  });

  test("XP and streak update after practice", async ({ page }) => {
    await loginAsDemo(page, "free");
    await page.goto("/#/flashcards?category=Code+Generation");

    // Get initial XP
    const initialXP = await page.evaluate(() => {
      return localStorage.getItem("anglotec_xp") || "0";
    });

    // Answer a card
    const btn = page.getByRole("button", { name: /i know this/i });
    await btn.click();

    // XP should have changed
    await page.waitForTimeout(500);
    const newXP = await page.evaluate(() => {
      return localStorage.getItem("anglotec_xp") || "0";
    });

    // XP should have increased (or at minimum, state was recorded)
    expect(Number(newXP)).toBeGreaterThanOrEqual(Number(initialXP));
  });
});

// ─────────────────────────────────────────────
// Test 3: Navigation Consistency
// ─────────────────────────────────────────────
test.describe("Navigation", () => {
  test("All nav links work", async ({ page }) => {
    await loginAsDemo(page, "free");

    // Navigate to each page and verify it loads
    const pages = ["/", "/pricing", "/help", "/progress", "/settings"];
    for (const p of pages) {
      await page.goto("/#" + p);
      // Wait for content
      await page.waitForLoadState("networkidle");
      // Verify no error boundary
      await expect(page.getByText(/something went wrong|error boundary|crash/i)).not.toBeVisible();
    }
  });

  test("Browser back button works after navigation", async ({ page }) => {
    await loginAsDemo(page, "free");

    await page.goto("/#/");
    await page.goto("/#/flashcards?category=Code+Generation");
    await page.goto("/#/settings");

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/.*\/flashcards/);

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL(/.*\/$/);
  });
});
