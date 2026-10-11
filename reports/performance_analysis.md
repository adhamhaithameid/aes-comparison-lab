# Performance Analysis — AES Implementation Comparison

## 1. Methodology

Benchmarks were conducted on an Apple M1 (arm64) running macOS 27.0.1, using
Apple clang 21.0.0 with -O3 optimization. Each measurement was timed with
`std::chrono::steady_clock` (monotonic, nanosecond resolution). Warmup
iterations were performed before timing. A checksum of the output was computed
after each pass to prevent dead-code elimination.

### Input Sizes

- 16 bytes (single block)
- 1 KiB (1,024 bytes)
- 100 KiB (102,400 bytes)
- 1 MiB (1,048,576 bytes)
- 10 MiB (10,485,760 bytes)

### Repetitions

- Scratch: 10 reps for small sizes, 3-2 reps for 1-10 MiB (due to ~2000x
  slower execution)
- OpenSSL: 10 reps for all sizes

### Operations

- **encrypt**: Full encryption of the input buffer
- **decrypt**: Full decryption of the input buffer
- **keysetup**: Key expansion / EVP context initialization

### Implementations

| Label | Description |
|-------|-------------|
| `scratch` | From-scratch AES-128 (ECB per-block, validation only) |
| `openssl-ecb` | OpenSSL AES-128-ECB (raw block cipher, same operation as scratch) |
| `openssl-gcm` | OpenSSL AES-128-GCM (authenticated encryption, different operation) |

**Note:** GCM results are reported separately and must not be compared
directly with raw ECB results — GCM includes authentication overhead
(GHASH) that raw block encryption does not.

## 2. Raw Data

See `results/benchmark_results.csv` for per-repetition measurements and
`results/benchmark_aggregate.csv` for summary statistics.

## 3. Summary Statistics

### Encryption Throughput (MiB/s)

| Implementation | 16 B | 1 KiB | 100 KiB | 1 MiB | 10 MiB |
|----------------|------|-------|---------|-------|--------|
| scratch | 0.178 | 0.212 | 0.206 | 0.260 | 0.341 |
| openssl-ecb | 30.10 | 468.97 | 609.65 | 717.73 | 712.48 |
| openssl-gcm | 14.91 | 402.40 | 686.56 | 694.18 | 693.38 |

### Decryption Throughput (MiB/s)

| Implementation | 16 B | 1 KiB | 100 KiB | 1 MiB | 10 MiB |
|----------------|------|-------|---------|-------|--------|
| scratch | 0.255 | 0.330 | 0.335 | 0.300 | 0.342 |
| openssl-ecb | 30.49 | 462.89 | 686.64 | 714.68 | 700.16 |
| openssl-gcm | 11.68 | 325.24 | 631.70 | 623.48 | 634.02 |

### Encryption Latency (ms)

| Implementation | 16 B | 1 KiB | 100 KiB | 1 MiB | 10 MiB |
|----------------|------|-------|---------|-------|--------|
| scratch | 0.086 | 4.616 | 477.486 | 4006.004 | 29372.314 |
| openssl-ecb | 0.001 | 0.002 | 0.168 | 1.393 | 14.039 |
| openssl-gcm | 0.001 | 0.003 | 0.142 | 1.441 | 14.422 |

### Key Setup Time (ns)

| Implementation | Mean | Median |
|----------------|------|--------|
| scratch | 12,925 | 12,875 |
| openssl-ecb | 634 | 334 |

## 4. Key Observations

1. **Hardware acceleration**: OpenSSL on Apple M1 uses ARMv8 Cryptographic
   Extensions (`hw.optional.arm.FEAT_AES: 1`), providing ~2000x speedup
   over the from-scratch C++ implementation at large sizes (712 MiB/s vs
   0.34 MiB/s).

2. **GCM vs ECB**: GCM includes GHASH authentication overhead. At 10 MiB,
   GCM achieves 693 MiB/s vs ECB's 712 MiB/s — approximately 3% overhead.
   At small sizes (16 B), GCM is 2x slower than ECB due to fixed setup costs.

3. **Scaling**: Both implementations show linear scaling with input size
   (constant throughput) for sizes above ~100 KiB. Sub-100 KiB sizes are
   dominated by fixed overhead (key setup, context initialization).

4. **Small-input latency**: The scratch implementation takes ~86 μs for a
   single 16-byte block (encrypt), while OpenSSL takes ~0.8 μs — a ~108x
   difference. This is because the scratch implementation performs
   byte-by-byte GF(2⁸) multiplication (8 iterations per byte, 4 bytes per
   column, 4 columns, 10 rounds = 1280 GF multiplications per block).

5. **Scratch throughput plateau**: The scratch implementation achieves
   ~0.2-0.34 MiB/s regardless of input size, indicating it is compute-bound
   (not memory-bound). The slight increase at larger sizes (0.21 → 0.34 MiB/s)
   reflects amortization of loop overhead.

6. **OpenSSL throughput plateau**: OpenSSL ECB plateaus at ~715 MiB/s for
   sizes ≥ 1 MiB, likely limited by memory bandwidth or the AES pipeline
   depth on this core.

## 5. Performance Ratio

The performance improvement ratio of OpenSSL over scratch:

$$\text{Ratio} = \frac{\text{Throughput}_{\text{OpenSSL}}}{\text{Throughput}_{\text{scratch}}}$$

| Size | Encryption Ratio | Decryption Ratio |
|------|-----------------|------------------|
| 16 B | 169x | 120x |
| 1 KiB | 2213x | 1394x |
| 100 KiB | 2954x | 2048x |
| 1 MiB | 2757x | 2382x |
| 10 MiB | 2095x | 2046x |

The ratio peaks at ~100 KiB to 1 MiB (~2000-3000x) and slightly decreases
at 10 MiB as both implementations become more memory-bound.

## 6. Figures

- `figures/encryption_time.svg` — Encryption time vs input size (log-log)
- `figures/decryption_time.svg` — Decryption time vs input size (log-log)
- `figures/throughput.svg` — Throughput vs input size (log-x, linear-y)
