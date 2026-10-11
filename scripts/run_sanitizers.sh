#!/usr/bin/env bash
# run_sanitizers.sh — Build and run with AddressSanitizer + UBSan
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="${1:-$PROJECT_ROOT/build-san}"

echo "[run_sanitizers] Configuring sanitizer build..."
cmake -S "$PROJECT_ROOT" -B "$BUILD_DIR" \
    -DCMAKE_BUILD_TYPE=Debug \
    -DAES_ENABLE_SANITIZERS=ON 2>&1 | tail -3

echo "[run_sanitizers] Building..."
cmake --build "$BUILD_DIR" -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)" 2>&1 | tail -3

echo "[run_sanitizers] Running tests under sanitizers..."
"$BUILD_DIR/aes_tests" "$PROJECT_ROOT/tests/test_vectors"

echo "[run_sanitizers] PASS: No sanitizer findings"
