#!/usr/bin/env bash
# run_e2e.sh — Run browser end-to-end tests with Playwright
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

echo "[run_e2e] Running browser E2E tests..."

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "[run_e2e] SKIP: Node.js not found"
    exit 0
fi

cd "$WEB_DIR"

# Install dependencies if needed
if [ ! -d node_modules ]; then
    echo "[run_e2e] Installing npm dependencies..."
    npm install 2>&1 | tail -5
fi

# Install Playwright browsers if needed
if ! npx playwright install --dry-run 2>/dev/null | grep -q "already installed"; then
    echo "[run_e2e] Installing Playwright browsers..."
    npx playwright install --with-deps chromium 2>&1 | tail -5
fi

# Start the web server in the background
echo "[run_e2e] Starting web server..."
cd "$WEB_DIR/public"
python3 -m http.server 8080 &
SERVER_PID=$!
sleep 2

# Run E2E tests
echo "[run_e2e] Running Playwright tests..."
cd "$WEB_DIR"
npx playwright test 2>&1

# Cleanup
kill $SERVER_PID 2>/dev/null || true

echo "[run_e2e] PASS: Browser E2E tests complete"
