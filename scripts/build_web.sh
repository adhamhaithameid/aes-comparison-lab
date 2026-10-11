#!/usr/bin/env bash
# build_web.sh — Build and prepare the web platform
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

echo "[build_web] Building web platform..."

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "[build_web] ERROR: Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

# Install dependencies
cd "$WEB_DIR"
if [ -f package.json ]; then
    echo "[build_web] Installing npm dependencies..."
    npm install 2>&1 | tail -5
fi

# Build web assets (if a build step exists)
if [ -f package.json ] && grep -q '"build"' package.json; then
    echo "[build_web] Running build..."
    npm run build 2>&1 | tail -5
fi

echo "[build_web] PASS: Web platform ready at $WEB_DIR/public/"
echo "[build_web] Serve with: cd $WEB_DIR/public && python3 -m http.server 8080"
