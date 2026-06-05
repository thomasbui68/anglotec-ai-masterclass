#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# E2E Test Runner — runs on every deployment
# Usage: ./run-e2e.sh [deploy-url]
# ─────────────────────────────────────────────────────────

set -euo pipefail

# Use provided URL or default to local dev server
URL="${1:-http://localhost:5173}"

echo "═══════════════════════════════════════════════════"
echo "  Anglotec AI Masterclass — E2E Test Suite"
echo "  Target: $URL"
echo "═══════════════════════════════════════════════════"

# 1. Check if target is reachable
echo ""
echo "[1/4] Checking target availability..."
if ! curl -sf "$URL" > /dev/null 2>&1; then
  echo "❌ Target $URL is not reachable"
  echo "    Make sure the dev server is running (npm run dev)"
  exit 1
fi
echo "✅ Target is reachable"

# 2. Install browsers if needed
echo ""
echo "[2/4] Ensuring Playwright browsers are installed..."
npx playwright install chromium firefox webkit 2>/dev/null || true
echo "✅ Browsers ready"

# 3. Run the tests
echo ""
echo "[3/4] Running E2E tests across Chromium, Firefox, WebKit..."
PLAYWRIGHT_BASE_URL="$URL" npx playwright test --reporter=list 2>&1

# 4. Report results
echo ""
echo "═══════════════════════════════════════════════════"
if [ $? -eq 0 ]; then
  echo "  ✅ ALL TESTS PASSED"
  echo "  Ready for deployment!"
else
  echo "  ❌ SOME TESTS FAILED"
  echo "  Check the report: npx playwright show-report"
  exit 1
fi
echo "═══════════════════════════════════════════════════"
