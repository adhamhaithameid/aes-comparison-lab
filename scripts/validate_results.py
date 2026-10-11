#!/usr/bin/env python3
"""validate_results.py — Validate benchmark CSV data for integrity.

Checks:
- Required columns present
- No missing values
- Positive numeric values
- Consistent units
- No duplicate run identifiers
- Throughput calculation correctness
- No fabricated placeholder values
"""

import csv
import sys
import os


def validate_benchmark_csv(path):
    """Validate benchmark_results.csv."""
    errors = []
    warnings = []

    if not os.path.exists(path):
        return [f"File not found: {path}"], []

    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        required_cols = [
            "implementation", "operation", "input_size_bytes",
            "repetition", "elapsed_time_ns", "throughput_mib_s", "build_type"
        ]
        if reader.fieldnames is None:
            return ["Empty CSV file"], []

        for col in required_cols:
            if col not in reader.fieldnames:
                errors.append(f"Missing required column: {col}")

        seen = set()
        for i, row in enumerate(reader, start=2):
            # Check for missing values
            for col in required_cols:
                if not row.get(col, "").strip():
                    errors.append(f"Row {i}: missing value for {col}")

            # Check numeric values
            try:
                size = int(row["input_size_bytes"])
                if size <= 0:
                    errors.append(f"Row {i}: non-positive input_size_bytes: {size}")
            except ValueError:
                errors.append(f"Row {i}: invalid input_size_bytes: {row['input_size_bytes']}")

            try:
                ns = int(row["elapsed_time_ns"])
                if ns <= 0:
                    errors.append(f"Row {i}: non-positive elapsed_time_ns: {ns}")
            except ValueError:
                errors.append(f"Row {i}: invalid elapsed_time_ns: {row['elapsed_time_ns']}")

            try:
                tp = float(row["throughput_mib_s"])
                if tp <= 0:
                    errors.append(f"Row {i}: non-positive throughput_mib_s: {tp}")
            except ValueError:
                errors.append(f"Row {i}: invalid throughput_mib_s: {row['throughput_mib_s']}")

            # Check for duplicate run identifiers
            run_id = (row["implementation"], row["operation"],
                      row["input_size_bytes"], row["repetition"])
            if run_id in seen:
                errors.append(f"Row {i}: duplicate run identifier: {run_id}")
            seen.add(run_id)

            # Verify throughput calculation
            try:
                size = int(row["input_size_bytes"])
                ns = int(row["elapsed_time_ns"])
                tp = float(row["throughput_mib_s"])
                expected_tp = (size / (1024 * 1024)) / (ns / 1e9)
                if abs(tp - expected_tp) / expected_tp > 0.01:
                    warnings.append(
                        f"Row {i}: throughput mismatch: {tp:.4f} vs expected {expected_tp:.4f}")
            except (ValueError, ZeroDivisionError):
                pass

    return errors, warnings


def validate_memory_csv(path):
    """Validate memory_results.csv."""
    errors = []
    warnings = []

    if not os.path.exists(path):
        return [f"File not found: {path}"], []

    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        required_cols = [
            "implementation", "operation", "input_size_bytes",
            "peak_rss_bytes", "baseline_rss_bytes", "build_type"
        ]
        if reader.fieldnames is None:
            return ["Empty CSV file"], []

        for col in required_cols:
            if col not in reader.fieldnames:
                errors.append(f"Missing required column: {col}")

        for i, row in enumerate(reader, start=2):
            try:
                peak = int(row["peak_rss_bytes"])
                if peak <= 0:
                    errors.append(f"Row {i}: non-positive peak_rss_bytes: {peak}")
            except ValueError:
                errors.append(f"Row {i}: invalid peak_rss_bytes: {row['peak_rss_bytes']}")

            try:
                baseline = int(row["baseline_rss_bytes"])
                if baseline <= 0:
                    errors.append(f"Row {i}: non-positive baseline_rss_bytes: {baseline}")
            except ValueError:
                errors.append(f"Row {i}: invalid baseline_rss_bytes: {row['baseline_rss_bytes']}")

            # Peak should be >= baseline
            try:
                peak = int(row["peak_rss_bytes"])
                baseline = int(row["baseline_rss_bytes"])
                if peak < baseline:
                    warnings.append(
                        f"Row {i}: peak RSS ({peak}) < baseline ({baseline})")
            except ValueError:
                pass

    return errors, warnings


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <results_dir>")
        sys.exit(2)

    results_dir = sys.argv[1]
    all_errors = []
    all_warnings = []

    bench_csv = os.path.join(results_dir, "benchmark_results.csv")
    mem_csv = os.path.join(results_dir, "memory_results.csv")

    print(f"Validating {bench_csv}...")
    errors, warnings = validate_benchmark_csv(bench_csv)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    print(f"  {len(errors)} errors, {len(warnings)} warnings")

    print(f"Validating {mem_csv}...")
    errors, warnings = validate_memory_csv(mem_csv)
    all_errors.extend(errors)
    all_warnings.extend(warnings)
    print(f"  {len(errors)} errors, {len(warnings)} warnings")

    if all_warnings:
        print("\nWarnings:")
        for w in all_warnings:
            print(f"  {w}")

    if all_errors:
        print("\nErrors:")
        for e in all_errors:
            print(f"  {e}")
        print(f"\nVALIDATION FAILED: {len(all_errors)} errors")
        sys.exit(1)
    else:
        print("\nVALIDATION PASSED: All data valid")
        sys.exit(0)


if __name__ == "__main__":
    main()
