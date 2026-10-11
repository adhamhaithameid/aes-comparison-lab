#!/usr/bin/env bash
# run_all.py — process benchmark results, generate aggregate statistics,
# validate CSV data, and produce SVG figures for the AES comparison report.
#
# Usage: python3 scripts/run_all.py <results_dir> <reports_dir>

import csv
import math
import os
import statistics
import sys
from collections import defaultdict


def read_benchmark_csv(path):
    rows = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "implementation": row["implementation"],
                "operation": row["operation"],
                "input_size_bytes": int(row["input_size_bytes"]),
                "repetition": int(row["repetition"]),
                "elapsed_time_ns": int(row["elapsed_time_ns"]),
                "throughput_mib_s": float(row["throughput_mib_s"]),
                "build_type": row["build_type"],
            })
    return rows


def aggregate(rows):
    """Group by (implementation, operation, input_size_bytes) and compute stats."""
    groups = defaultdict(list)
    for r in rows:
        key = (r["implementation"], r["operation"], r["input_size_bytes"])
        groups[key].append(r)
    results = []
    for (impl, op, size), group in sorted(groups.items()):
        times = [g["elapsed_time_ns"] for g in group]
        throughputs = [g["throughput_mib_s"] for g in group]
        results.append({
            "implementation": impl,
            "operation": op,
            "input_size_bytes": size,
            "count": len(group),
            "mean_time_ns": statistics.mean(times),
            "median_time_ns": statistics.median(times),
            "stdev_time_ns": statistics.stdev(times) if len(times) > 1 else 0.0,
            "min_time_ns": min(times),
            "max_time_ns": max(times),
            "mean_throughput_mib_s": statistics.mean(throughputs),
            "median_throughput_mib_s": statistics.median(throughputs),
            "stdev_throughput_mib_s": statistics.stdev(throughputs) if len(throughputs) > 1 else 0.0,
        })
    return results


def write_aggregate_csv(agg, path):
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "implementation", "operation", "input_size_bytes", "count",
            "mean_time_ns", "median_time_ns", "stdev_time_ns",
            "min_time_ns", "max_time_ns",
            "mean_throughput_mib_s", "median_throughput_mib_s",
            "stdev_throughput_mib_s",
        ])
        for a in agg:
            writer.writerow([
                a["implementation"], a["operation"], a["input_size_bytes"],
                a["count"],
                f"{a['mean_time_ns']:.0f}", f"{a['median_time_ns']:.0f}",
                f"{a['stdev_time_ns']:.0f}",
                f"{a['min_time_ns']:.0f}", f"{a['max_time_ns']:.0f}",
                f"{a['mean_throughput_mib_s']:.4f}",
                f"{a['median_throughput_mib_s']:.4f}",
                f"{a['stdev_throughput_mib_s']:.4f}",
            ])


def validate_rows(rows):
    """Basic validity checks on benchmark data."""
    warnings = []
    for r in rows:
        if r["elapsed_time_ns"] <= 0:
            warnings.append(
                f"Non-positive elapsed time: {r}")
        if r["throughput_mib_s"] <= 0:
            warnings.append(
                f"Non-positive throughput: {r}")
        if r["input_size_bytes"] <= 0:
            warnings.append(
                f"Non-positive input size: {r}")
    return warnings


def generate_svg_chart(data, title, x_label, y_label, output_path,
                       log_x=False, log_y=False):
    """Generate a simple SVG line chart from data points.
    
    data: list of (x, y, label) tuples
    """
    width, height = 800, 500
    margin_left, margin_right = 90, 30
    margin_top, margin_bottom = 60, 70
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom

    if not data:
        return

    xs = [d[0] for d in data]
    ys = [d[1] for d in data]
    labels = [d[2] for d in data]

    if log_x:
        xs = [math.log10(x) if x > 0 else 0 for x in xs]
    if log_y:
        ys = [math.log10(y) if y > 0 else 0 for y in ys]

    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    if x_min == x_max:
        x_max = x_min + 1
    if y_min == y_max:
        y_max = y_min + 1

    # Add padding
    x_range = x_max - x_min
    y_range = y_max - y_min
    x_min -= x_range * 0.05
    x_max += x_range * 0.05
    y_min -= y_range * 0.05
    y_max += y_range * 0.05

    def scale_x(x):
        return margin_left + (x - x_min) / (x_max - x_min) * plot_w

    def scale_y(y):
        return margin_top + plot_h - (y - y_min) / (y_max - y_min) * plot_h

    # Group by label for legend
    series = defaultdict(list)
    for x, y, label in zip(xs, ys, labels):
        series[label].append((x, y))

    colors = [
        "#2166ac", "#b2182b", "#1b7837", "#762a83",
        "#e08214", "#8073ac", "#c51b7d", "#2d004b",
    ]

    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" '
               f'width="{width}" height="{height}" '
               f'style="background:#fafafa">')
    svg.append(f'<rect width="{width}" height="{height}" fill="#fafafa"/>')

    # Title
    svg.append(f'<text x="{width/2}" y="30" text-anchor="middle" '
               f'font-family="sans-serif" font-size="18" font-weight="bold">'
               f'{title}</text>')

    # Axes
    svg.append(f'<line x1="{margin_left}" y1="{margin_top}" '
               f'x2="{margin_left}" y2="{margin_top + plot_h}" '
               f'stroke="black" stroke-width="1.5"/>')
    svg.append(f'<line x1="{margin_left}" y1="{margin_top + plot_h}" '
               f'x2="{margin_left + plot_w}" y2="{margin_top + plot_h}" '
               f'stroke="black" stroke-width="1.5"/>')

    # Y-axis label
    svg.append(f'<text x="20" y="{margin_top + plot_h/2}" '
               f'text-anchor="middle" font-family="sans-serif" '
               f'font-size="14" transform="rotate(-90,20,{margin_top + plot_h/2})">'
               f'{y_label}</text>')

    # X-axis label
    svg.append(f'<text x="{margin_left + plot_w/2}" y="{height - 15}" '
               f'text-anchor="middle" font-family="sans-serif" font-size="14">'
               f'{x_label}</text>')

    # Grid lines and tick labels
    num_ticks = 5
    for i in range(num_ticks + 1):
        y_val = y_min + (y_max - y_min) * i / num_ticks
        y_px = scale_y(y_val)
        svg.append(f'<line x1="{margin_left}" y1="{y_px:.1f}" '
                   f'x2="{margin_left + plot_w}" y2="{y_px:.1f}" '
                   f'stroke="#ddd" stroke-width="0.8"/>')
        if log_y:
            label = f"10^{int(y_val)}" if y_val == int(y_val) else f"{10**y_val:.1e}"
        else:
            if y_val >= 1e6:
                label = f"{y_val/1e6:.1f}M"
            elif y_val >= 1e3:
                label = f"{y_val/1e3:.1f}K"
            else:
                label = f"{y_val:.2f}"
        svg.append(f'<text x="{margin_left - 8}" y="{y_px + 4:.1f}" '
                   f'text-anchor="end" font-family="sans-serif" '
                   f'font-size="11">{label}</text>')

    for i in range(num_ticks + 1):
        x_val = x_min + (x_max - x_min) * i / num_ticks
        x_px = scale_x(x_val)
        svg.append(f'<line x1="{x_px:.1f}" y1="{margin_top}" '
                   f'x2="{x_px:.1f}" y2="{margin_top + plot_h}" '
                   f'stroke="#ddd" stroke-width="0.8"/>')
        if log_x:
            label = f"10^{int(x_val)}" if x_val == int(x_val) else ""
        else:
            if x_val >= 1e6:
                label = f"{x_val/1e6:.0f}M"
            elif x_val >= 1e3:
                label = f"{x_val/1e3:.0f}K"
            else:
                label = f"{x_val:.0f}"
        svg.append(f'<text x="{x_px:.1f}" y="{margin_top + plot_h + 18}" '
                   f'text-anchor="middle" font-family="sans-serif" '
                   f'font-size="11">{label}</text>')

    # Data series
    for idx, (label, points) in enumerate(series.items()):
        color = colors[idx % len(colors)]
        # Sort by x
        points.sort(key=lambda p: p[0])
        path_parts = []
        for x, y in points:
            path_parts.append(f"{scale_x(x):.1f},{scale_y(y):.1f}")
        path = " ".join(path_parts)
        svg.append(f'<polyline points="{path}" fill="none" '
                   f'stroke="{color}" stroke-width="2.5"/>')
        # Dots
        for x, y in points:
            svg.append(f'<circle cx="{scale_x(x):.1f}" cy="{scale_y(y):.1f}" '
                       f'r="4" fill="{color}"/>')

    # Legend
    legend_x = margin_left + plot_w - 180
    legend_y = margin_top + 10
    for idx, label in enumerate(series.keys()):
        color = colors[idx % len(colors)]
        ly = legend_y + idx * 20
        svg.append(f'<line x1="{legend_x}" y1="{ly}" x2="{legend_x + 20}" '
                   f'y2="{ly}" stroke="{color}" stroke-width="2.5"/>')
        svg.append(f'<text x="{legend_x + 25}" y="{ly + 4}" '
                   f'font-family="sans-serif" font-size="12">{label}</text>')

    svg.append('</svg>')

    with open(output_path, "w") as f:
        f.write("\n".join(svg))
    print(f"  Generated {output_path}")


def generate_all_figures(agg, figures_dir):
    os.makedirs(figures_dir, exist_ok=True)

    # Figure 1: Encryption time vs input size
    data = [(a["input_size_bytes"], a["mean_time_ns"] / 1e6,
             f"{a['implementation']} encrypt")
            for a in agg if a["operation"] == "encrypt"]
    if data:
        generate_svg_chart(
            data, "Encryption Time vs Input Size",
            "Input size (bytes)", "Time (ms)",
            os.path.join(figures_dir, "encryption_time.svg"),
            log_x=True, log_y=True)

    # Figure 2: Decryption time vs input size
    data = [(a["input_size_bytes"], a["mean_time_ns"] / 1e6,
             f"{a['implementation']} decrypt")
            for a in agg if a["operation"] == "decrypt"]
    if data:
        generate_svg_chart(
            data, "Decryption Time vs Input Size",
            "Input size (bytes)", "Time (ms)",
            os.path.join(figures_dir, "decryption_time.svg"),
            log_x=True, log_y=True)

    # Figure 3: Throughput vs input size
    data = [(a["input_size_bytes"], a["mean_throughput_mib_s"],
             f"{a['implementation']} {a['operation']}")
            for a in agg]
    if data:
        generate_svg_chart(
            data, "Throughput vs Input Size",
            "Input size (bytes)", "Throughput (MiB/s)",
            os.path.join(figures_dir, "throughput.svg"),
            log_x=True, log_y=True)


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <results_dir> <reports_dir>")
        sys.exit(2)

    results_dir = sys.argv[1]
    reports_dir = sys.argv[2]
    figures_dir = os.path.join(reports_dir, "figures")

    bench_csv = os.path.join(results_dir, "benchmark_results.csv")
    if not os.path.exists(bench_csv):
        print(f"ERROR: {bench_csv} not found")
        sys.exit(1)

    print("Reading benchmark results...")
    rows = read_benchmark_csv(bench_csv)
    print(f"  {len(rows)} data points")

    print("Validating data...")
    warnings = validate_rows(rows)
    if warnings:
        for w in warnings:
            print(f"  WARNING: {w}")
    else:
        print("  All data valid")

    print("Computing aggregate statistics...")
    agg = aggregate(rows)
    agg_csv = os.path.join(results_dir, "benchmark_aggregate.csv")
    write_aggregate_csv(agg, agg_csv)
    print(f"  Written to {agg_csv}")

    print("Generating figures...")
    generate_all_figures(agg, figures_dir)

    print("Done.")


if __name__ == "__main__":
    main()
