#!/usr/bin/env bash
# run_tests.sh — Run the automated test suite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="${1:-$PROJECT_ROOT/build}"

echo "[run_tests] Running automated test suite..."
"$BUILD_DIR/aes_tests" "$PROJECT_ROOT/tests/test_vectors"
echo "[run_tests] PASS: All tests passed"
