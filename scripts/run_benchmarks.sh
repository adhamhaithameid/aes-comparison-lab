#!/usr/bin/env bash
# run_benchmarks.sh — Run performance benchmarks
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="${1:-$PROJECT_ROOT/build}"
RESULTS_DIR="${2:-$PROJECT_ROOT/results}"
CSV="$RESULTS_DIR/benchmark_results.csv"

echo "[run_benchmarks] Running benchmarks..."

# Scratch: fewer reps for large sizes
for op in encrypt decrypt keysetup; do
    for size in 16 1024 102400; do
        "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size "$size" \
            --reps 10 --warmup 2 --csv "$CSV" --label Release
    done
    "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size 1048576 \
        --reps 3 --warmup 1 --csv "$CSV" --label Release
    "$BUILD_DIR/aes_benchmark" --impl scratch --op "$op" --size 10485760 \
        --reps 2 --warmup 1 --csv "$CSV" --label Release
done

# OpenSSL ECB
for op in encrypt decrypt keysetup; do
    for size in 16 1024 102400 1048576 10485760; do
        "$BUILD_DIR/aes_benchmark" --impl openssl-ecb --op "$op" --size "$size" \
            --reps 10 --warmup 3 --csv "$CSV" --label Release
    done
done

# OpenSSL GCM
for op in encrypt decrypt; do
    for size in 16 1024 102400 1048576 10485760; do
        "$BUILD_DIR/aes_benchmark" --impl openssl-gcm --op "$op" --size "$size" \
            --reps 10 --warmup 3 --csv "$CSV" --label Release
    done
done

echo "[run_benchmarks] PASS: Benchmarks complete — $CSV"
