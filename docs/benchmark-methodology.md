# Benchmark Methodology

## Overview

The benchmark methodology measures and compares the performance of three AES-128 implementations: a from-scratch C++ block cipher, OpenSSL's AES-128-ECB, and OpenSSL's AES-128-GCM. The benchmark binary (`aes_benchmark`) collects per-repetition timing data, which is then aggregated into summary statistics.

---

## Environment

| Component | Details |
|---|---|
| Date | 2026-10-11 |
| OS | macOS 27.0.1 (Darwin) |
| CPU | Apple M1 (arm64, 8-core) |
| Compiler | Apple clang 21.0.0 |
| Build type | Release (`-O3`) |
| CMake | 3.31.3 |
| OpenSSL | 4.0.3 (Homebrew) |
| Hardware AES | ARMv8 Cryptographic Extensions (`hw.optional.arm.FEAT_AES: 1`) |
| NEON | Available (`hw.optional.neon: 1`) |

---

## Benchmark Implementations

| Label | Description | Operation Type |
|---|---|---|
| `scratch` | From-scratch AES-128 (ECB per-block, validation only) | Raw block cipher |
| `openssl-ecb` | OpenSSL AES-128-ECB (raw block cipher, no padding) | Raw block cipher |
| `openssl-gcm` | OpenSSL AES-128-GCM (authenticated encryption) | Authenticated encryption |

**Important**: GCM results are reported separately and must not be compared directly with raw ECB results. GCM includes GHASH authentication overhead that raw block encryption does not.

---

## Procedure

### Step 1: Build

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

### Step 2: Run Benchmarks

```bash
# Scratch implementation
./build/aes_benchmark --impl scratch --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl scratch --op decrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl scratch --op keysetup --size 1048576 --reps 10 --csv results/benchmark_results.csv

# OpenSSL ECB
./build/aes_benchmark --impl openssl-ecb --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-ecb --op decrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-ecb --op keysetup --size 1048576 --reps 10 --csv results/benchmark_results.csv

# OpenSSL GCM
./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-gcm --op decrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
```

### Step 3: Aggregate Results

```bash
python3 scripts/run_all.py results reports
```

---

## Input Sizes

| Size | Bytes | Blocks (16-byte) |
|---|---|---|
| 16 B | 16 | 1 |
| 1 KiB | 1,024 | 64 |
| 100 KiB | 102,400 | 6,400 |
| 1 MiB | 1,048,576 | 65,536 |
| 10 MiB | 10,485,760 | 655,360 |

---

## Operations

| Operation | Description |
|---|---|
| `encrypt` | Full encryption of the input buffer |
| `decrypt` | Full decryption of the input buffer |
| `keysetup` | Key expansion / EVP context initialization |

---

## Metrics

### Throughput (MiB/s)

Computed as: `input_size_bytes / (1024 * 1024) / elapsed_seconds`

### Latency (ns)

Measured with `std::chrono::steady_clock` (monotonic, nanosecond resolution).

### Key Setup Time

Measured separately for each implementation to isolate the cost of key expansion and context initialization.

---

## Repetition Strategy

| Implementation | Small Sizes (16 B - 100 KiB) | Large Sizes (1 MiB - 10 MiB) |
|---|---|---|
| scratch | 10 reps | 3 reps (1 MiB), 2 reps (10 MiB) |
| openssl-ecb | 10 reps | 10 reps |
| openssl-gcm | 10 reps | 10 reps |

Fewer repetitions for the scratch implementation at large sizes due to approximately 2000x slower execution time.

---

## Warmup

Each benchmark run performs 3 warmup iterations before timing begins. This ensures:
- CPU caches are warm
- Branch predictors are trained
- Memory allocators have stabilized
- OpenSSL internal state is initialized

---

## Dead-Code Elimination Prevention

A checksum (FNV-1a) of the output is computed after each pass and written to a `volatile` sink. This prevents the compiler from optimizing away the encryption/decryption work as dead code.

---

## Statistical Aggregation

Per-repetition data is aggregated into:

| Statistic | Description |
|---|---|
| `mean` | Arithmetic mean of all repetitions |
| `median` | Median value |
| `stdev` | Standard deviation |
| `min` | Minimum value |
| `max` | Maximum value |

---

## Memory Profiling

### Tool

`/usr/bin/time -l` (macOS) — reports maximum resident set size (peak RSS) in bytes.

### Procedure

1. Run the benchmark binary with a specific implementation and input size
2. Capture peak RSS from the `time` output
3. Record baseline RSS (process with minimal workload)
4. Each measurement is taken in a fresh process

### Sizes Measured

1 KiB, 100 KiB, 1 MiB, 10 MiB for all three implementations, for both encrypt and decrypt operations.

---

## Complete Workflow

The entire benchmark pipeline can be run with:

```bash
scripts/run_all.sh
```

This executes: build, test, sanitizer test, benchmark, memory profiling, aggregation, and report generation.

---

## Reproducibility

### Deterministic Random Input

The benchmark uses a fixed seed (`std::mt19937_64 rng(0xBEEF)`) for generating random input data and keys, ensuring that all runs use identical input.

### Environment Capture

`results/environment.txt` records:
- OS version and build
- CPU architecture
- Compiler version and target
- CMake version
- OpenSSL version and root path
- Build type
- Hardware capabilities (AES, NEON)

### Data Files

| File | Description |
|---|---|
| `results/benchmark_results.csv` | Per-repetition timing data (355 rows) |
| `results/benchmark_aggregate.csv` | Summary statistics (40 rows) |
| `results/memory_results.csv` | Memory profiling data (24 rows) |
| `results/environment.txt` | System information |

---

## Validity Threats

1. **Single platform**: Results are from Apple M1 only. Performance on other platforms (x86 with AES-NI, ARM without crypto extensions) will differ.
2. **Compiler optimizations**: `-O3` may optimize differently than `-O2` or `-Os`.
3. **Memory measurement scope**: Peak RSS includes process overhead, OpenSSL library loading, and runtime initialization — not just algorithm-specific memory.
4. **Thermal throttling**: Extended benchmark runs may be affected by CPU thermal management.
5. **System load**: Background processes may affect timing measurements.
