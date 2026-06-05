# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Logout >> Logout clears session and redirects
- Location: e2e/login.spec.ts:285:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /exit|logout|sign out/i })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - status [ref=e3]: Navigated to Account Settings — Anglotec AI Masterclass
  - generic [ref=e5]:
    - img [ref=e6]
    - heading "Please Sign In" [level=2] [ref=e8]
    - paragraph [ref=e9]: You need to be signed in to view your settings.
    - button "Go to Sign In" [ref=e10] [cursor=pointer]
  - region "Notifications alt+T"
```

# Test source

```ts
  201 |     await page.getByLabel(/email/i).fill("notareal@example.com");
  202 |     await page.getByLabel(/password/i).fill("wrongpassword123");
  203 |     await page.getByRole("button", { name: /sign in/i }).click();
  204 | 
  205 |     // Should show auth error
  206 |     await expect(
  207 |       page.getByText(/invalid|not found|failed|incorrect/i).first()
  208 |     ).toBeVisible({ timeout: 10000 });
  209 |   });
  210 | 
  211 |   test("Password visibility toggle works", async ({ page }) => {
  212 |     await page.goto("/#/login");
  213 | 
  214 |     const pwInput = page.getByLabel(/password/i);
  215 |     await pwInput.fill("secret123");
  216 | 
  217 |     // Initially hidden
  218 |     await expect(pwInput).toHaveAttribute("type", "password");
  219 | 
  220 |     // Click show button (Eye icon)
  221 |     await page.locator("button[type='button']").filter({ has: page.locator("svg") }).first().click();
  222 | 
  223 |     // Now visible (type=text)
  224 |     await expect(pwInput).toHaveAttribute("type", "text");
  225 |   });
  226 | 
  227 |   test("Navigation to register works", async ({ page }) => {
  228 |     await page.goto("/#/login");
  229 | 
  230 |     await page.getByText(/create account/i).click();
  231 | 
  232 |     // Should land on register page
  233 |     await expect(page).toHaveURL(/.*\/register/);
  234 |     await expect(page.getByRole("heading", { name: /sign up|register|create/i })).toBeVisible();
  235 |   });
  236 | 
  237 |   test("Navigation to forgot-password works", async ({ page }) => {
  238 |     await page.goto("/#/login");
  239 | 
  240 |     await page.getByText(/forgot password/i).click();
  241 | 
  242 |     await expect(page).toHaveURL(/.*\/forgot-password/);
  243 |   });
  244 | });
  245 | 
  246 | // ─────────────────────────────────────────────
  247 | // Test 3: Register Flow
  248 | // ─────────────────────────────────────────────
  249 | test.describe("Registration Flow", () => {
  250 |   test.beforeEach(async ({ page }) => {
  251 |     await clearBrowserState(page);
  252 |   });
  253 | 
  254 |   test("Registration form renders", async ({ page }) => {
  255 |     await page.goto("/#/register");
  256 | 
  257 |     await expect(page.getByLabel(/email/i)).toBeVisible();
  258 |     await expect(page.getByLabel(/password/i)).toBeVisible();
  259 |     await expect(page.getByRole("button", { name: /sign up|register|create/i })).toBeVisible();
  260 |   });
  261 | 
  262 |   test("Password strength indicator works", async ({ page }) => {
  263 |     await page.goto("/#/register");
  264 | 
  265 |     const pwInput = page.getByLabel(/password/i);
  266 | 
  267 |     // Weak password
  268 |     await pwInput.fill("123");
  269 |     await expect(page.getByText(/weak|too short/i)).toBeVisible();
  270 | 
  271 |     // Medium password
  272 |     await pwInput.fill("Password1");
  273 |     await expect(page.getByText(/medium|fair/i)).toBeVisible();
  274 | 
  275 |     // Strong password
  276 |     await pwInput.fill("MyStr0ng!Pass#2026");
  277 |     await expect(page.getByText(/strong|excellent/i)).toBeVisible();
  278 |   });
  279 | });
  280 | 
  281 | // ─────────────────────────────────────────────
  282 | // Test 4: Logout Flow
  283 | // ─────────────────────────────────────────────
  284 | test.describe("Logout", () => {
  285 |   test("Logout clears session and redirects", async ({ page }) => {
  286 |     // Start logged in (demo)
  287 |     await page.goto("/#/login");
  288 |     await page.evaluate(async () => {
  289 |       const res = await fetch("/.netlify/functions/demo-login", {
  290 |         method: "POST",
  291 |         headers: { "Content-Type": "application/json" },
  292 |         body: JSON.stringify({ tier: "free" }),
  293 |       });
  294 |       const data = await res.json();
  295 |       localStorage.setItem("demo_session", JSON.stringify(data.session));
  296 |     });
  297 | 
  298 |     await page.goto("/#/settings");
  299 | 
  300 |     // Click logout (Exit button)
> 301 |     await page.getByRole("button", { name: /exit|logout|sign out/i }).click();
      |                                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  302 | 
  303 |     // Should be redirected to login
  304 |     await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
  305 | 
  306 |     // Session should be cleared
  307 |     const sessionCleared = await page.evaluate(() => {
  308 |       return !localStorage.getItem("demo_session");
  309 |     });
  310 |     expect(sessionCleared).toBe(true);
  311 |   });
  312 | });
  313 | 
```