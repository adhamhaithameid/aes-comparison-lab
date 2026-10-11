#!/usr/bin/env bash
# run_all.sh — complete workflow for the AES comparison project.
#
# Stages:
#   1. Detect OS and required tools (cmake, C++ compiler, OpenSSL, python3)
#   2. Configure and compile the project (Release)
#   3. Run automated tests
#   4. Run sanitizer tests (ASan + UBSan)
#   5. Run Release benchmarks
#   6. Run memory-usage experiments
#   7. Collect system and compiler information
#   8. Generate CSV files and aggregate statistics
#   9. Generate graphs
#  10. Summarize successes, failures, and skipped stages
#
# Usage: scripts/run_all.sh [results_dir] [reports_dir]
# Exit code: 0 if all required stages succeed, nonzero otherwise.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="${1:-$PROJECT_ROOT/results}"
REPORTS_DIR="${2:-$PROJECT_ROOT/reports}"
BUILD_DIR="$PROJECT_ROOT/build"
BUILD_SAN_DIR="$PROJECT_ROOT/build-san"

PASS=0
FAIL=0
SKIP=0

log()  { echo "[run_all] $*"; }
ok()   { echo "[run_all] PASS: $*"; PASS=$((PASS + 1)); }
fail() { echo "[run_all] FAIL: $*"; FAIL=$((FAIL + 1)); }
skip() { echo "[run_all] SKIP: $*"; SKIP=$((SKIP + 1)); }

# ---------------------------------------------------------------------------
# Stage 1: Detect OS and required tools
# ---------------------------------------------------------------------------
log "Stage 1: Detecting OS and required tools"

OS="$(uname -s)"
ARCH="$(uname -m)"
log "  OS: $OS, Arch: $ARCH"

CMAKE_BIN="$(command -v cmake || true)"
if [[ -z "$CMAKE_BIN" ]]; then
    fail "cmake not found. Install with: brew install cmake"
    exit 1
fi
ok "cmake found: $CMAKE_BIN ($(cmake --version | head -1))"

CXX_BIN="${CXX:-}"
if [[ -z "$CXX_BIN" ]]; then
    if command -v clang++ &>/dev/null; then
        CXX_BIN="$(command -v clang++)"
    elif command -v g++ &>/dev/null; then
        CXX_BIN="$(command -v g++)"
    else
        fail "No C++ compiler found. Install Xcode Command Line Tools or g++."
        exit 1
    fi
fi
ok "C++ compiler: $CXX_BIN ($($CXX_BIN --version | head -1))"

# OpenSSL
OPENSSL_ROOT=""
for prefix in /opt/homebrew/opt/openssl@4 /opt/homebrew/opt/openssl@3 \
              /opt/homebrew/opt/openssl /usr/local/opt/openssl; do
    if [[ -f "$prefix/include/openssl/evp.h" ]]; then
        OPENSSL_ROOT="$prefix"
        break
    fi
done
if [[ -z "$OPENSSL_ROOT" ]]; then
    # Try system OpenSSL
    if echo '#include <openssl/evp.h>' | $CXX_BIN -x c++ - -fsyntax-only 2>/dev/null; then
        OPENSSL_ROOT="system"
    else
        fail "OpenSSL development files not found. Install with: brew install openssl"
        exit 1
    fi
fi
ok "OpenSSL found: $OPENSSL_ROOT"

PYTHON_BIN="$(command -v python3 || true)"
if [[ -z "$PYTHON_BIN" ]]; then
    fail "python3 not found. Install with: brew install python3"
    exit 1
fi
ok "python3 found: $PYTHON_BIN ($(python3 --version 2>&1))"

# ---------------------------------------------------------------------------
# Stage 2: Configure and compile
# ---------------------------------------------------------------------------
log "Stage 2: Configuring and compiling (Release)"

mkdir -p "$RESULTS_DIR" "$REPORTS_DIR"

CMAKE_PREFIX_ARGS=()
if [[ "$OPENSSL_ROOT" != "system" ]]; then
    CMAKE_PREFIX_ARGS+=("-DCMAKE_PREFIX_PATH=$OPENSSL_ROOT")
fi

cmake -S "$PROJECT_ROOT" -B "$BUILD_DIR" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER="$CXX_BIN" \
    "${CMAKE_PREFIX_ARGS[@]}" 2>&1 | tail -5

cmake --build "$BUILD_DIR" -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)" 2>&1 | tail -5
ok "Release build complete"

# ---------------------------------------------------------------------------
# Stage 3: Run automated tests
# ---------------------------------------------------------------------------
log "Stage 3: Running automated tests"

TEST_OUTPUT="$RESULTS_DIR/test_results.txt"
if "$BUILD_DIR/aes_tests" "$PROJECT_ROOT/tests/test_vectors" 2>&1 | tee "$TEST_OUTPUT"; then
    ok "All tests passed"
else
    fail "Tests failed — see $TEST_OUTPUT"
fi

# ---------------------------------------------------------------------------
# Stage 4: Sanitizer tests
# ---------------------------------------------------------------------------
log "Stage 4: Running sanitizer tests (ASan + UBSan)"

cmake -S "$PROJECT_ROOT" -B "$BUILD_SAN_DIR" \
    -DCMAKE_BUILD_TYPE=Debug \
    -DAES_ENABLE_SANITIZERS=ON \
    -DCMAKE_CXX_COMPILER="$CXX_BIN" \
    "${CMAKE_PREFIX_ARGS[@]}" 2>&1 | tail -3

cmake --build "$BUILD_SAN_DIR" -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)" 2>&1 | tail -3

SAN_TEST_OUTPUT="$RESULTS_DIR/sanitizer_test_results.txt"
if "$BUILD_SAN_DIR/aes_tests" "$PROJECT_ROOT/tests/test_vectors" 2>&1 | tee "$SAN_TEST_OUTPUT"; then
    ok "Sanitizer tests passed"
else
    fail "Sanitizer tests failed — see $SAN_TEST_OUTPUT"
fi

# ---------------------------------------------------------------------------
# Stage 5: Run Release benchmarks
# ---------------------------------------------------------------------------
log "Stage 5: Running Release benchmarks"

BENCH_CSV="$RESULTS_DIR/benchmark_results.csv"
rm -f "$BENCH_CSV"

# Scratch: fewer reps for large sizes (it's ~50x slower than OpenSSL)
for op in encrypt decrypt keysetup; do
    for size in 16 1024 102400; do
        "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size "$size" \
            --reps 10 --warmup 2 --csv "$BENCH_CSV" --label Release
    done
    "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size 1048576 \
        --reps 3 --warmup 1 --csv "$BENCH_CSV" --label Release
    "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size 10485760 \
        --reps 2 --warmup 1 --csv "$BENCH_CSV" --label Release
done

# OpenSSL ECB: full reps
for op in encrypt decrypt keysetup; do
    for size in 16 1024 102400 1048576 10485760; do
        "$BUILD_DIR/aes_benchmark" --impl openssl-ecb --op "$op" --size "$size" \
            --reps 10 --warmup 3 --csv "$BENCH_CSV" --label Release
    done
done

# OpenSSL GCM: full reps
for op in encrypt decrypt; do
    for size in 16 1024 102400 1048576 10485760; do
        "$BUILD_DIR/aes_benchmark" --impl openssl-gcm --op "$op" --size "$size" \
            --reps 10 --warmup 3 --csv "$BENCH_CSV" --label Release
    done
done

ok "Benchmarks complete: $BENCH_CSV"

# ---------------------------------------------------------------------------
# Stage 6: Memory-usage experiments
# ---------------------------------------------------------------------------
log "Stage 6: Running memory-usage experiments"

MEM_CSV="$RESULTS_DIR/memory_results.csv"
echo "implementation,operation,input_size_bytes,peak_rss_bytes,baseline_rss_bytes,build_type" > "$MEM_CSV"

# Use /usr/bin/time -l on macOS (peak RSS in bytes), or /usr/bin/time -v on Linux
if [[ "$OS" == "Darwin" ]]; then
    TIME_CMD="/usr/bin/time -l"
    get_peak_rss() {
        # Parse "maximum resident set size" from time -l output (bytes on macOS)
        grep "maximum resident set size" | awk '{print $1}'
    }
else
    TIME_CMD="/usr/bin/time -v"
    get_peak_rss() {
        grep "Maximum resident set size" | awk '{print $NF}'
    }
fi

for impl in scratch openssl-ecb openssl-gcm; do
    for op in encrypt decrypt; do
        for size in 1024 102400 1048576 10485760; do
            # Run in a fresh process and measure peak RSS
            OUTPUT=$($TIME_CMD "$BUILD_DIR/aes_benchmark" \
                --impl "$impl" --op "$op" --size "$size" \
                --reps 1 --warmup 0 --csv /dev/null --label Release 2>&1)
            PEAK=$(echo "$OUTPUT" | get_peak_rss || echo "0")
            # Baseline: run with size 0 (minimal work)
            BASE_OUTPUT=$($TIME_CMD "$BUILD_DIR/aes_benchmark" \
                --impl "$impl" --op "$op" --size 0 \
                --reps 1 --warmup 0 --csv /dev/null --label Release 2>&1)
            BASE=$(echo "$BASE_OUTPUT" | get_peak_rss || echo "0")
            echo "$impl,$op,$size,$PEAK,$BASE,Release" >> "$MEM_CSV"
            log "  $impl $op size=$size peak=${PEAK}B baseline=${BASE}B"
        done
    done
done

ok "Memory experiments complete: $MEM_CSV"

# ---------------------------------------------------------------------------
# Stage 7: Collect system and compiler information
# ---------------------------------------------------------------------------
log "Stage 7: Collecting system and compiler information"

ENV_FILE="$RESULTS_DIR/environment.txt"
{
    echo "=== System Information ==="
    echo "Date: $(date)"
    echo "OS: $OS"
    echo "OS Version: $(sw_vers 2>/dev/null || cat /etc/os-release 2>/dev/null | head -5)"
    echo "Architecture: $ARCH"
    echo "CPU: $(sysctl -n machdep.cpu.brand_string 2>/dev/null || cat /proc/cpuinfo 2>/dev/null | grep 'model name' | head -1)"
    echo ""
    echo "=== Compiler ==="
    echo "C++ Compiler: $CXX_BIN"
    "$CXX_BIN" --version | head -2
    echo ""
    echo "=== CMake ==="
    cmake --version | head -1
    echo ""
    echo "=== OpenSSL ==="
    echo "OpenSSL Root: $OPENSSL_ROOT"
    if [[ "$OPENSSL_ROOT" != "system" ]]; then
        "$OPENSSL_ROOT/bin/openssl" version 2>/dev/null || true
    else
        openssl version 2>/dev/null || true
    fi
    echo ""
    echo "=== Build Type ==="
    echo "Release (-O3)"
    echo ""
    echo "=== Hardware Acceleration ==="
    if [[ "$OS" == "Darwin" ]]; then
        sysctl -a 2>/dev/null | grep -i "aes\|crypto\|neon" || echo "No AES-specific sysctl entries"
    else
        grep -o 'aes\|pclmulqdq\|avx2\|avx512' /proc/cpuinfo 2>/dev/null | sort -u || echo "No AES flags found"
    fi
} > "$ENV_FILE"
ok "Environment info: $ENV_FILE"

# ---------------------------------------------------------------------------
# Stage 8: Generate CSV files and aggregate statistics
# ---------------------------------------------------------------------------
log "Stage 8: Generating aggregate statistics and figures"

python3 "$SCRIPT_DIR/run_all.py" "$RESULTS_DIR" "$REPORTS_DIR"
ok "Aggregate statistics and figures generated"

# ---------------------------------------------------------------------------
# Stage 9: Summary
# ---------------------------------------------------------------------------
log "========================================"
log "Summary"
log "  Passed: $PASS"
log "  Failed: $FAIL"
log "  Skipped: $SKIP"
log "========================================"

if [[ $FAIL -gt 0 ]]; then
    log "RESULT: FAILURES DETECTED"
    exit 1
else
    log "RESULT: ALL STAGES COMPLETED SUCCESSFULLY"
    exit 0
fi
