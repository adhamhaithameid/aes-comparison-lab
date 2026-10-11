#!/usr/bin/env bash
# run_regression.sh — Run the complete regression suite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[run_regression] Running regression suite..."

# 1. Build
echo "[run_regression] Building..."
cmake -S "$PROJECT_ROOT" -B "$PROJECT_ROOT/build" -DCMAKE_BUILD_TYPE=Release 2>&1 | tail -3
cmake --build "$PROJECT_ROOT/build" -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)" 2>&1 | tail -3

# 2. Run tests
echo "[run_regression] Running tests..."
"$PROJECT_ROOT/build/aes_tests" "$PROJECT_ROOT/tests/test_vectors"

# 3. Run CLI KATs
echo "[run_regression] Running CLI known-answer tests..."
"$PROJECT_ROOT/build/aes_scratch" kat
"$PROJECT_ROOT/build/aes_openssl" selftest

# 4. Validate benchmark data
echo "[run_regression] Validating benchmark data..."
python3 "$PROJECT_ROOT/scripts/validate_results.py" "$PROJECT_ROOT/results"

echo "[run_regression] PASS: All regression checks passed"
