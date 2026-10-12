#!/usr/bin/env python3
"""
generate_web_data.py — regenerate web/public/js/benchmark-data.js from the CSVs.

The CSVs under results/ are the single source of truth for all benchmark and
memory figures shown on the website. This script derives the browser-side data
file from them, so the site can never drift away from the measured data.

Usage:
    python3 scripts/generate_web_data.py            # regenerate
    python3 scripts/generate_web_data.py --check    # verify, exit 1 if stale

Provenance: the generated file records the source files, their SHA-256
digests, the generating commit (when available) and the row counts, so any
figure on the site can be traced back to a raw measurement.
"""

from __future__ import annotations

import argparse
import csv
import glob
import hashlib
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AGG_CSV = os.path.join(ROOT, "results", "benchmark_aggregate.csv")
MEM_CSV = os.path.join(ROOT, "results", "memory_results.csv")
ENV_TXT = os.path.join(ROOT, "results", "environment.txt")
RAW_CSV = os.path.join(ROOT, "results", "benchmark_results.csv")
OUT_JS = os.path.join(ROOT, "web", "public", "js", "benchmark-data.js")

REQUIRED_AGG_COLS = [
    "implementation", "operation", "input_size_bytes", "count",
    "mean_time_ns", "median_time_ns", "stdev_time_ns",
    "min_time_ns", "max_time_ns",
    "mean_throughput_mib_s", "median_throughput_mib_s", "stdev_throughput_mib_s",
]
REQUIRED_MEM_COLS = [
    "implementation", "operation", "input_size_bytes",
    "peak_rss_bytes", "baseline_rss_bytes",
]
OPTIONAL_MEM_COLS = ["build_type"]
KNOWN_IMPLEMENTATIONS = {"scratch", "openssl-ecb", "openssl-gcm"}
KNOWN_OPERATIONS = {"encrypt", "decrypt", "keysetup"}
KNOWN_SIZES = {16, 1024, 102400, 1048576, 10485760}
KNOWN_BUILDS = {"Release", "Debug"}


class DataError(Exception):
    """Raised when a CSV fails validation."""


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_csv(path: str, required: list[str]) -> list[dict]:
    if not os.path.exists(path):
        raise DataError(f"missing required data file: {path}")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise DataError(f"{path}: file is empty")
        missing = [c for c in required if c not in reader.fieldnames]
        if missing:
            raise DataError(f"{path}: missing columns {missing}")
        rows = list(reader)
    if not rows:
        raise DataError(f"{path}: no data rows")
    return rows


def to_int(row: dict, col: str, path: str) -> int:
    raw = (row.get(col) or "").strip()
    if raw == "":
        raise DataError(f"{path}: empty value for {col} in row {row}")
    try:
        return int(raw)
    except ValueError:
        raise DataError(f"{path}: non-integer value {raw!r} for {col}")


def to_float(row: dict, col: str, path: str) -> float:
    raw = (row.get(col) or "").strip()
    if raw == "":
        raise DataError(f"{path}: empty value for {col} in row {row}")
    try:
        return float(raw)
    except ValueError:
        raise DataError(f"{path}: non-numeric value {raw!r} for {col}")


def validate_aggregate(rows: list[dict]) -> list[dict]:
    """Validate aggregate rows and return normalised records."""
    out, seen = [], set()
    for i, row in enumerate(rows, start=2):
        impl = (row.get("implementation") or "").strip()
        op = (row.get("operation") or "").strip()
        if impl not in KNOWN_IMPLEMENTATIONS:
            raise DataError(f"aggregate row {i}: unknown implementation {impl!r}")
        if op not in KNOWN_OPERATIONS:
            raise DataError(f"aggregate row {i}: unknown operation {op!r}")

        size = to_int(row, "input_size_bytes", "benchmark_aggregate.csv")
        if size not in KNOWN_SIZES:
            raise DataError(f"aggregate row {i}: unexpected input size {size}")

        count = to_int(row, "count", "benchmark_aggregate.csv")
        if count < 1:
            raise DataError(f"aggregate row {i}: count must be >= 1, got {count}")

        mean_ns = to_int(row, "mean_time_ns", "benchmark_aggregate.csv")
        median_ns = to_int(row, "median_time_ns", "benchmark_aggregate.csv")
        stdev_ns = to_int(row, "stdev_time_ns", "benchmark_aggregate.csv")
        min_ns = to_int(row, "min_time_ns", "benchmark_aggregate.csv")
        max_ns = to_int(row, "max_time_ns", "benchmark_aggregate.csv")
        if min(mean_ns, median_ns, min_ns, max_ns) <= 0:
            raise DataError(f"aggregate row {i}: non-positive duration")
        if not (min_ns <= median_ns <= max_ns):
            raise DataError(
                f"aggregate row {i}: min/median/max inconsistent "
                f"({min_ns} <= {median_ns} <= {max_ns})")
        if stdev_ns < 0:
            raise DataError(f"aggregate row {i}: negative stdev")

        tp = to_float(row, "mean_throughput_mib_s", "benchmark_aggregate.csv")
        if tp <= 0:
            raise DataError(f"aggregate row {i}: non-positive throughput {tp}")

        # median_throughput is derived as size / median_time, so it must agree
        # to within rounding. mean_throughput is instead the arithmetic mean of
        # the per-repetition throughputs, which by Jensen's inequality is never
        # smaller than size / mean_time — so only that bound is checked.
        median_tp = to_float(row, "median_throughput_mib_s", "benchmark_aggregate.csv")
        expected_median = (size / (1024 * 1024)) / (median_ns / 1e9)
        if abs(median_tp - expected_median) / expected_median > 0.01:
            raise DataError(
                f"aggregate row {i}: median throughput {median_tp} inconsistent "
                f"with size/median_time (expected ~{expected_median:.4f})")
        expected_mean = (size / (1024 * 1024)) / (mean_ns / 1e9)
        if tp < expected_mean * 0.99:
            raise DataError(
                f"aggregate row {i}: mean throughput {tp} below size/mean_time "
                f"({expected_mean:.4f}) — impossible for a mean of throughputs")

        key = (impl, op, size)
        if key in seen:
            raise DataError(f"aggregate row {i}: duplicate series {key}")
        seen.add(key)

        out.append({
            "implementation": impl,
            "operation": op,
            "input_size_bytes": size,
            "count": count,
            "mean_time_ns": mean_ns,
            "median_time_ns": median_ns,
            "stdev_time_ns": stdev_ns,
            "min_time_ns": min_ns,
            "max_time_ns": max_ns,
            "mean_throughput_mib_s": round(tp, 4),
            "median_throughput_mib_s": round(
                to_float(row, "median_throughput_mib_s", "benchmark_aggregate.csv"), 4),
            "stdev_throughput_mib_s": round(
                to_float(row, "stdev_throughput_mib_s", "benchmark_aggregate.csv"), 4),
        })
    return out


def validate_memory(rows: list[dict]) -> list[dict]:
    out, seen = [], set()
    for i, row in enumerate(rows, start=2):
        impl = (row.get("implementation") or "").strip()
        op = (row.get("operation") or "").strip()
        if impl not in KNOWN_IMPLEMENTATIONS:
            raise DataError(f"memory row {i}: unknown implementation {impl!r}")
        if op not in KNOWN_OPERATIONS:
            raise DataError(f"memory row {i}: unknown operation {op!r}")

        size = to_int(row, "input_size_bytes", "memory_results.csv")
        peak = to_int(row, "peak_rss_bytes", "memory_results.csv")
        base = to_int(row, "baseline_rss_bytes", "memory_results.csv")
        if size <= 0 or peak <= 0 or base <= 0:
            raise DataError(f"memory row {i}: non-positive measurement")
        if peak < base:
            raise DataError(
                f"memory row {i}: peak RSS ({peak}) < baseline ({base})")

        key = (impl, op, size, (row.get("build_type") or "").strip())
        if key in seen:
            raise DataError(f"memory row {i}: duplicate series {key}")
        seen.add(key)

        out.append({
            "implementation": impl,
            "operation": op,
            "input_size_bytes": size,
            "peak_rss_bytes": peak,
            "baseline_rss_bytes": base,
            "build_type": (row.get("build_type") or "").strip() or "unknown",
        })
    return out


def parse_environment(path: str) -> dict:
    """Parse results/environment.txt into a small dict for display."""
    if not os.path.exists(path):
        return {}
    text = open(path, encoding="utf-8").read()

    def field(label: str) -> str:
        m = re.search(rf"^{re.escape(label)}:[ \t]*(.+)$", text, re.M)
        return m.group(1).strip() if m else ""

    env: dict[str, str] = {}
    env["date"] = field("Date")
    env["os"] = "macOS " + field("ProductVersion") if field("ProductVersion") else ""
    env["arch"] = field("Architecture")
    env["cpu"] = field("CPU")

    # Compiler: prefer the version banner, fall back to the binary path.
    m = re.search(r"^(?:Apple )?clang version (.+)$", text, re.M)
    if m:
        env["compiler"] = "clang " + m.group(1).strip()
    elif field("C++ Compiler"):
        env["compiler"] = field("C++ Compiler")

    m = re.search(r"^cmake version (.+)$", text, re.M)
    if m:
        env["cmake"] = m.group(1).strip()

    # "OpenSSL 4.0.3 29 Sep 2026 (Library: …)" → "4.0.3"
    m = re.search(r"^OpenSSL (\d+\.\d+\.\d+)", text, re.M)
    if m:
        env["openssl"] = "OpenSSL " + m.group(1)

    m = re.search(r"^Release \((.+)\)$", text, re.M)
    if m:
        env["build_type"] = "Release " + m.group(1)

    env["hw_aes"] = "yes" if re.search(r"FEAT_AES:\s*1", text) else "no"
    return {k: v for k, v in env.items() if v}


def git_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        return "unknown"


def count_lines(path: str) -> int:
    if not os.path.exists(path):
        return 0
    with open(path, encoding="utf-8", errors="replace") as f:
        return sum(1 for _ in f)


def parse_test_summary(path: str) -> dict:
    """Read 'Total checks' / 'Failures' / RESULT and section names from a log."""
    out: dict[str, object] = {}
    if not os.path.exists(path):
        return out
    text = open(path, encoding="utf-8", errors="replace").read()
    m = re.search(r"Total checks:\s*(\d+)", text)
    if m:
        out["checks"] = int(m.group(1))
    m = re.search(r"Failures:\s*(\d+)", text)
    if m:
        out["failures"] = int(m.group(1))
    out["passed"] = bool(re.search(r"RESULT:\s*ALL TESTS PASSED", text))

    # Section titles, plus any "N/N cases passed" or counts reported under them.
    # The log header contains a local filesystem path, so only titles are kept.
    sections = []
    current = None
    for line in text.splitlines():
        m = re.match(r"^=== (.+?) ===\s*$", line)
        if m:
            current = {"title": m.group(1).strip()}
            sections.append(current)
            continue
        if current is None:
            continue
        m = re.match(r"^\s+(\d+)/(\d+) cases passed(.*)$", line)
        if m:
            current["passed"] = int(m.group(1))
            current["total"] = int(m.group(2))
            note = m.group(3).strip()
            if note:
                current["note"] = note.strip("()")
            continue
        m = re.match(r"^\s+(\d+) random blocks compared, (\d+) mismatches", line)
        if m:
            current["passed"] = int(m.group(1)) - int(m.group(2))
            current["total"] = int(m.group(1))
            current["mismatches"] = int(m.group(2))
    out["sections"] = sections
    return out


def gather_facts() -> dict:
    """Collect verifiable project facts from real artifacts on disk.

    Everything the case study page claims about scale (tests, pages,
    scenarios, figures, rows) is read here rather than typed into HTML.
    """
    web_dir = os.path.join(ROOT, "web", "public")
    pages = sorted(
        os.path.basename(p) for p in glob.glob(os.path.join(web_dir, "*.html")))
    lines = {
        p: count_lines(os.path.join(web_dir, p)) for p in pages
    }
    site_files = sorted(
        glob.glob(os.path.join(web_dir, "**", "*.html"), recursive=True)
        + glob.glob(os.path.join(web_dir, "**", "*.css"), recursive=True)
        + glob.glob(os.path.join(web_dir, "**", "*.js"), recursive=True))
    figures = sorted(
        os.path.relpath(p, ROOT)
        for p in glob.glob(os.path.join(ROOT, "reports", "figures", "*.svg")))
    scenarios = 0
    what_if = os.path.join(web_dir, "what-if.html")
    if os.path.exists(what_if):
        scenarios = open(what_if, encoding="utf-8").read().count("scenario-card")

    return {
        "tests": parse_test_summary(
            os.path.join(ROOT, "results", "test_results.txt")),
        "sanitizers": parse_test_summary(
            os.path.join(ROOT, "results", "sanitizer_test_results.txt")),
        "web": {
            "pages": pages,
            "page_count": len(pages),
            "total_lines": sum(count_lines(p) for p in site_files),
            "lines_by_page": lines,
            "js_modules": len(glob.glob(os.path.join(web_dir, "js", "*.js"))),
            "scenarios": scenarios,
        },
        "figures": figures,
        "source_files": {
            "core_lines": count_lines(os.path.join(ROOT, "src", "aes_core.hpp"))
                          + count_lines(os.path.join(ROOT, "src", "aes_core.cpp")),
            "benchmark_lines": count_lines(
                os.path.join(ROOT, "src", "benchmark.cpp")),
            "test_lines": count_lines(os.path.join(ROOT, "src", "test_main.cpp")),
        },
    }


def render(agg: list[dict], mem: list[dict], env: dict, prov: dict,
           facts: dict) -> str:
    def js(obj) -> str:
        # Compact but readable JSON — keys quoted, safe for JS.
        import json
        return json.dumps(obj, separators=(",", ": "))

    raw_count = prov["raw_rows"]
    lines = [
        "/**",
        " * benchmark-data.js — GENERATED FILE. DO NOT EDIT BY HAND.",
        " *",
        " * Regenerate with:  python3 scripts/generate_web_data.py",
        " * Verify with:      python3 scripts/generate_web_data.py --check",
        " *",
        " * Source of truth (CSVs under results/):",
        f" *   benchmark_aggregate.csv  sha256={prov['agg_sha'][:16]}…  {prov['agg_rows']} rows",
        f" *   memory_results.csv       sha256={prov['mem_sha'][:16]}…  {prov['mem_rows']} rows",
        f" *   benchmark_results.csv    sha256={prov['raw_sha'][:16]}…  {raw_count} raw measurements",
        f" *   environment.txt          sha256={prov['env_sha'][:16]}…",
        " *",
        f" * Generated: {prov['generated']} (UTC)",
        f" * Commit:    {prov['commit']}",
        " *",
        " * Every value below is a measured result. No figures are estimated,",
        " * interpolated or hand-written. Historical measurement — see",
        " * docs/benchmark-methodology.md for how it was produced.",
        " */",
        "",
        "(function (global) {",
        "  'use strict';",
        "",
        "  const aggregateData = " + js(agg) + ";",
        "",
        "  const memoryData = " + js(mem) + ";",
        "",
        "  const environment = " + js(env) + ";",
        "",
        "  const provenance = " + js(prov) + ";",
        "",
        "  const facts = " + js(facts) + ";",
        "",
    ]

    lines += [
        "  const BenchmarkData = {",
        "    aggregate: aggregateData,",
        "    memory: memoryData,",
        "    environment: environment,",
        "    provenance: provenance,",
        "    facts: facts,",
        "",
        "    getImplementations() {",
        "      return [...new Set(aggregateData.map(d => d.implementation))];",
        "    },",
        "",
        "    getOperations() {",
        "      return [...new Set(aggregateData.map(d => d.operation))];",
        "    },",
        "",
        "    getSizes() {",
        "      return [...new Set(aggregateData.map(d => d.input_size_bytes))].sort((a, b) => a - b);",
        "    },",
        "",
        "    /** Filter aggregate rows. Returns [] for impossible filters — never throws. */",
        "    filter(filters) {",
        "      filters = filters || {};",
        "      return aggregateData.filter(d => {",
        "        if (filters.implementation && filters.implementation !== 'all' && d.implementation !== filters.implementation) return false;",
        "        if (filters.operation && filters.operation !== 'all' && d.operation !== filters.operation) return false;",
        "        if (filters.size && filters.size !== 'all' && d.input_size_bytes !== parseInt(filters.size, 10)) return false;",
        "        return true;",
        "      });",
        "    },",
        "",
        "    /** Filter memory rows. Returns [] for impossible filters — never throws. */",
        "    filterMemory(filters) {",
        "      filters = filters || {};",
        "      return memoryData.filter(d => {",
        "        if (filters.implementation && filters.implementation !== 'all' && d.implementation !== filters.implementation) return false;",
        "        if (filters.operation && filters.operation !== 'all' && d.operation !== filters.operation) return false;",
        "        if (filters.size && filters.size !== 'all' && d.input_size_bytes !== parseInt(filters.size, 10)) return false;",
        "        return true;",
        "      });",
        "    },",
        "",
        "    /** Look up one aggregate record, or null. */",
        "    find(implementation, operation, size) {",
        "      return aggregateData.find(d =>",
        "        d.implementation === implementation &&",
        "        d.operation === operation &&",
        "        d.input_size_bytes === size) || null;",
        "    },",
        "",
        "    /** Ratio between two implementations at a size, or null if data missing. */",
        "    speedRatio(implA, implB, operation, size) {",
        "      const a = this.find(implA, operation, size);",
        "      const b = this.find(implB, operation, size);",
        "      if (!a || !b || !b.mean_throughput_mib_s) return null;",
        "      return a.mean_throughput_mib_s / b.mean_throughput_mib_s;",
        "    },",
        "",
        "    formatBytes(bytes) {",
        "      if (!isFinite(bytes)) return '—';",
        "      if (bytes < 1024) return bytes + ' B';",
        "      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';",
        "      if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';",
        "      return (bytes / 1073741824).toFixed(2) + ' GB';",
        "    },",
        "",
        "    formatSize(bytes) {",
        "      if (bytes < 1024) return bytes + ' B';",
        "      if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';",
        "      if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + ' MB';",
        "      return (bytes / 1073741824).toFixed(1) + ' GB';",
        "    },",
        "",
        "    formatTime(ns) {",
        "      if (!isFinite(ns) || ns <= 0) return '—';",
        "      if (ns < 1000) return ns + ' ns';",
        "      if (ns < 1000000) return (ns / 1000).toFixed(1) + ' µs';",
        "      if (ns < 1000000000) return (ns / 1000000).toFixed(2) + ' ms';",
        "      return (ns / 1000000000).toFixed(2) + ' s';",
        "    },",
        "",
        "    formatThroughput(mibS) {",
        "      if (!isFinite(mibS) || mibS <= 0) return '—';",
        "      if (mibS < 1) return mibS.toFixed(4) + ' MiB/s';",
        "      return mibS.toFixed(1) + ' MiB/s';",
        "    },",
        "",
        "    formatCount(n) {",
        "      return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');",
        "    }",
        "  };",
        "",
        "  if (typeof module !== 'undefined' && module.exports) {",
        "    module.exports = BenchmarkData;",
        "  }",
        "  global.BenchmarkData = BenchmarkData;",
        "",
        "})(typeof window !== 'undefined' ? window : globalThis);",
        "",
    ]
    return "\n".join(lines)


def build() -> tuple[str, dict]:
    agg_rows = read_csv(AGG_CSV, REQUIRED_AGG_COLS)
    mem_rows = read_csv(MEM_CSV, REQUIRED_MEM_COLS)

    agg = validate_aggregate(agg_rows)
    mem = validate_memory(mem_rows)

    with open(RAW_CSV, encoding="utf-8") as f:
        raw_count = sum(1 for _ in f) - 1

    env = parse_environment(ENV_TXT)
    facts = gather_facts()

    # The site asserts "all tests pass", so refuse to publish a data file
    # derived from a failing or unreadable log.
    tests = facts.get("tests") or {}
    sans = facts.get("sanitizers") or {}
    for label, t in (("results/test_results.txt", tests),
                     ("results/sanitizer_test_results.txt", sans)):
        if "checks" not in t:
            raise DataError(f"{label}: no 'Total checks' summary found")
        if t.get("failures") != 0 or not t.get("passed"):
            raise DataError(
                f"{label}: log reports {t.get('failures')} failures — "
                "refusing to generate site data from a failing run")
    if tests["checks"] != sans["checks"]:
        raise DataError(
            "release and sanitizer logs disagree on check count "
            f"({tests['checks']} vs {sans['checks']})")
    if facts["web"]["page_count"] == 0:
        raise DataError("no HTML pages found under web/public")
    if not facts["figures"]:
        raise DataError("no figure SVGs found under reports/figures")

    prov = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "commit": git_commit(),
        "agg_rows": len(agg),
        "mem_rows": len(mem),
        "raw_rows": raw_count,
        "agg_sha": sha256(AGG_CSV),
        "mem_sha": sha256(MEM_CSV),
        "raw_sha": sha256(RAW_CSV),
        "env_sha": sha256(ENV_TXT) if os.path.exists(ENV_TXT) else "",
        "source_files": [
            "results/benchmark_aggregate.csv",
            "results/memory_results.csv",
            "results/benchmark_results.csv",
            "results/environment.txt",
        ],
        "units": {
            "mean_time_ns": "nanoseconds",
            "mean_throughput_mib_s": "MiB/s (mebibytes per second)",
            "peak_rss_bytes": "bytes",
        },
        "note": "Historical measurements from a single Apple M1 machine. "
                "Not a universal performance guarantee. See "
                "docs/benchmark-methodology.md.",
    }
    return render(agg, mem, env, prov, facts), prov


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="verify the generated file is up to date")
    args = ap.parse_args()

    try:
        content, prov = build()
    except DataError as exc:
        print(f"DATA ERROR: {exc}", file=sys.stderr)
        return 1

    if args.check:
        if not os.path.exists(OUT_JS):
            print(f"STALE: {OUT_JS} does not exist", file=sys.stderr)
            return 1
        with open(OUT_JS, encoding="utf-8") as f:
            current = f.read()
        # Compare everything except volatile provenance (generation timestamp
        # and commit, which legitimately change on every commit).
        VOLATILE = re.compile(
            r'("generated":\s*"[^"]*"|"commit":\s*"[^"]*")')

        def strip_volatile(s: str) -> str:
            s = VOLATILE.sub('"volatile": ""', s)
            return "\n".join(
                l for l in s.splitlines() if not l.startswith(" * Generated:")
                and not l.startswith(" * Commit:"))
        if strip_volatile(current) != strip_volatile(content):
            print("STALE: web/public/js/benchmark-data.js does not match the CSVs.",
                  file=sys.stderr)
            print("Run: python3 scripts/generate_web_data.py", file=sys.stderr)
            return 1
        print(f"OK: benchmark-data.js is in sync "
              f"({prov['agg_rows']} aggregate rows, {prov['mem_rows']} memory rows, "
              f"{prov['raw_rows']} raw measurements)")
        return 0

    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {os.path.relpath(OUT_JS, ROOT)}")
    print(f"  aggregate rows : {prov['agg_rows']}")
    print(f"  memory rows    : {prov['mem_rows']}")
    print(f"  raw measurements: {prov['raw_rows']}")
    print(f"  commit         : {prov['commit']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
