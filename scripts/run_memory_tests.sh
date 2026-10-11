#!/usr/bin/env bash
# run_memory_tests.sh — Run memory-usage experiments
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="${1:-$PROJECT_ROOT/build}"
RESULTS_DIR="${2:-$PROJECT_ROOT/results}"
CSV="$RESULTS_DIR/memory_results.csv"

echo "[run_memory_tests] Running memory experiments..."

echo "implementation,operation,input_size_bytes,peak_rss_bytes,baseline_rss_bytes,build_type" > "$CSV"

for impl in scratch openssl-ecb openssl-gcm; do
    for op in encrypt decrypt; do
        for size in 1024 102400 1048576 10485760; do
            OUTPUT=$(/usr/bin/time -l "$BUILD_DIR/aes_benchmark" \
                --impl "$impl" --op "$op" --size "$size" \
                --reps 1 --warmup 0 --csv /dev/null --label Release 2>&1)
            PEAK=$(echo "$OUTPUT" | grep "maximum resident set size" | awk '{print $1}')
            BASE_OUTPUT=$(/usr/bin/time -l "$BUILD_DIR/aes_benchmark" \
                --impl "$impl" --op "$op" --size 0 \
                --reps 1 --warmup 0 --csv /dev/null --label Release 2>&1)
            BASE=$(echo "$BASE_OUTPUT" | grep "maximum resident set size" | awk '{print $1}')
            echo "$impl,$op,$size,$PEAK,$BASE,Release" >> "$CSV"
            echo "  $impl $op size=$size peak=${PEAK}B baseline=${BASE}B"
        done
    done
done

echo "[run_memory_tests] PASS: Memory experiments complete — $CSV"
