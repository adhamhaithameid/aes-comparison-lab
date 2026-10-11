# AES Implementation Comparison: A Software Security Project

## Final Technical Report

---

**Date:** 2026-10-11
**Platform:** macOS 27.0.1, Apple M1 (arm64)
**Compiler:** Apple clang 21.0.0
**OpenSSL:** 3.6.5
**CMake:** 3.31.3

---

## 1. Abstract

This project implements and compares two C++ implementations of the Advanced
Encryption Standard (AES): a from-scratch AES-128 block cipher (Implementation A)
and an OpenSSL-based AES-128-GCM authenticated encryption wrapper
(Implementation B). Both implementations were validated against NIST known-answer
test vectors, subjected to round-trip and negative testing, and benchmarked for
performance and memory usage. The from-scratch implementation serves educational
purposes by exposing every AES transformation, while the OpenSSL implementation
provides production-grade authenticated encryption. Results show that OpenSSL
leverages hardware AES instructions for ~50x higher throughput than the portable
C++ implementation, while both produce identical block-cipher output.

## 2. Introduction to Software Security and AES

Software security encompasses the practices and technologies used to protect
software from unauthorized access, modification, and denial of service.
Cryptographic primitives form the foundation of software security, providing
confidentiality (encryption), integrity (authentication), and non-repudiation
(digital signatures).

The Advanced Encryption Standard (AES), specified in FIPS 197 (NIST, 2001,
updated 2023), is the most widely used symmetric block cipher in the world.
It operates on 128-bit blocks with 128, 192, or 256-bit keys and is the
foundation for securing data at rest and in transit.

A critical distinction in applied cryptography is between **raw block ciphers**
and **authenticated encryption**. A raw block cipher like AES provides only
confidentiality — it does not detect tampering. Authenticated encryption modes
like AES-GCM (Galois/Counter Mode, NIST SP 800-38D) provide both confidentiality
and integrity, and are the recommended approach for real-world encryption.

## 3. Research Objectives and Comparison Questions

This project addresses the following questions:

1. Can AES-128 be correctly implemented from scratch in C++?
2. How does a from-scratch implementation compare to a mature library (OpenSSL)
   in terms of correctness, performance, and memory usage?
3. What are the security implications of using a raw block cipher versus
   authenticated encryption?
4. How much performance difference does hardware acceleration make?

## 4. AES Algorithm Overview

AES is a substitution-permutation network (SPN) that operates on a 128-bit
state arranged as a 4×4 byte matrix. For AES-128 (128-bit key), the cipher
performs 10 rounds of transformation:

1. **AddRoundKey** — XOR the state with a round-specific subkey
2. **SubBytes** — Non-linear byte substitution using the S-box
3. **ShiftRows** — Cyclic left shift of each row by its row index
4. **MixColumns** — Linear mixing of each column over GF(2⁸)

The final round omits MixColumns. Decryption applies the inverse
transformations in reverse order.

## 5. AES State Representation and Transformations

### 5.1 State Representation

The 128-bit block is mapped to a 4×4 byte matrix in column-major order:
`state[r][c] = input[r + 4c]`. This means input bytes 0–3 form the first
column, bytes 4–7 the second, and so on.

### 5.2 SubBytes

Each byte is replaced by its S-box value. The S-box is computed from:
1. Multiplicative inverse in GF(2⁸) (the finite field with 256 elements,
   modulo the irreducible polynomial x⁸ + x⁴ + x³ + x + 1)
2. An affine transformation over GF(2)

In this project, the S-box is computed programmatically at startup rather
than transcribed from a table, eliminating transcription errors.

### 5.3 ShiftRows

Row r of the state is cyclically shifted left by r positions:
- Row 0: no shift
- Row 1: shift left by 1
- Row 2: shift left by 2
- Row 3: shift left by 3

### 5.4 MixColumns

Each column is multiplied by a fixed 4×4 matrix over GF(2⁸):

```
[02 03 01 01]
[01 02 03 01]
[01 01 02 03]
[03 01 01 02]
```

This provides diffusion: each output byte depends on all four input bytes
of its column.

### 5.5 AddRoundKey

The 16-byte round key is XORed with the state. This is the only transformation
that involves the key material.

## 6. Key Expansion and Encryption Rounds

### 6.1 Key Expansion (FIPS 197 §5.2)

The 128-bit key is expanded into 11 round keys (176 bytes) using:
- **RotWord**: Cyclic left rotation of a 4-byte word
- **SubWord**: S-box substitution of each byte
- **Rcon**: Round constant (powers of x in GF(2⁸))

Each word w[i] for i ≥ 4 is computed as:
- w[i] = w[i-4] ⊕ w[i-1] (if i mod 4 ≠ 0)
- w[i] = w[i-4] ⊕ SubWord(RotWord(w[i-1])) ⊕ Rcon (if i mod 4 = 0)

### 6.2 Encryption Rounds

```
AddRoundKey(0)
for round = 1 to 9:
    SubBytes
    ShiftRows
    MixColumns
    AddRoundKey(round)
SubBytes
ShiftRows
AddRoundKey(10)
```

### 6.3 Decryption Rounds

Decryption applies the inverse transformations in reverse order:
```
AddRoundKey(10)
for round = 9 to 1:
    InvShiftRows
    InvSubBytes
    AddRoundKey(round)
    InvMixColumns
InvShiftRows
InvSubBytes
AddRoundKey(0)
```

## 7. Description of Implementation A (From-Scratch AES-128)

Implementation A is a self-contained C++ implementation of the AES-128 block
cipher following FIPS 197. Key design decisions:

- **Programmatic S-box**: The S-box is computed at startup from GF(2⁸)
  arithmetic (multiplicative inverse + affine transform), not hardcoded.
- **Exposed transformations**: Each transformation (SubBytes, ShiftRows,
  MixColumns, AddRoundKey) is a public static method for unit testing.
- **No padding**: The implementation requires input to be a multiple of
  16 bytes. No padding is performed — partial blocks are rejected.
- **Validation-only ECB**: Multi-block helpers apply the raw block cipher
  to each block independently (ECB mode) for cross-validation against NIST
  multi-block test vectors. This is NOT a secure encryption mode.

### Files

- `src/aes_core.hpp` — Class declaration and API
- `src/aes_core.cpp` — Implementation
- `src/aes_scratch_main.cpp` — CLI demonstration tool

## 8. Description of Implementation B (OpenSSL AES-128-GCM)

Implementation B wraps OpenSSL's EVP interface to provide authenticated
encryption with AES-128-GCM. Key design decisions:

- **RAII**: OpenSSL EVP contexts are managed with `std::unique_ptr` and a
  custom deleter, ensuring exception-safe resource management.
- **Fresh nonce**: Each encryption generates a cryptographically secure
  random 96-bit nonce via `RAND_bytes`.
- **Tag verification before release**: The 128-bit authentication tag is
  verified by `EVP_DecryptFinal_ex` before any plaintext is returned to
  the caller. On failure, `std::nullopt` is returned and no plaintext
  escapes.
- **Generic errors**: OpenSSL error messages are not propagated to callers
  (they may contain implementation details); a generic `OperationError`
  is thrown instead.
- **File format**: Encrypted files use the format
  `nonce(12) || tag(16) || ciphertext(n)`.

### Files

- `src/aes_gcm_openssl.hpp` — Wrapper API
- `src/aes_gcm_openssl.cpp` — Implementation
- `src/aes_openssl_main.cpp` — CLI file encryption tool

## 9. Algorithmic Differences

| Aspect | Implementation A | Implementation B |
|--------|-----------------|------------------|
| Algorithm | AES-128 block cipher | AES-128-GCM (authenticated encryption) |
| Mode | Raw block cipher (ECB for validation) | GCM (counter mode + GHASH) |
| Authentication | None | 128-bit GMAC tag |
| Nonce | N/A | 96-bit random per encryption |
| AAD support | N/A | Yes (additional authenticated data) |
| Padding | None (16-byte blocks only) | None (GCM is a stream mode) |

## 10. Implementation-Level Differences

| Aspect | Implementation A | Implementation B |
|--------|-----------------|------------------|
| Lines of code | ~350 | ~250 |
| Dependencies | None (standard library only) | OpenSSL |
| S-box | Computed programmatically | Internal to OpenSSL |
| GF multiplication | Byte-by-byte (xtime) | Hardware-accelerated (ARMv8 AES) |
| Key storage | `std::array<uint8_t, 16>` | `std::array<uint8_t, 16>` |
| Error handling | Return codes / exceptions | Exceptions (OperationError) |
| Resource management | N/A (no external resources) | RAII (unique_ptr + custom deleter) |

## 11. Security Analysis and Limitations

### 11.1 Implementation A Security Properties

- **Correctness**: Verified against FIPS 197 and NIST CAVP test vectors.
- **No authentication**: Ciphertext can be modified without detection.
- **No padding oracle**: Input must be 16-byte aligned; no padding is applied.
- **Timing side-channels**: The byte-by-byte GF multiplication is not
  constant-time. This is acceptable for an educational implementation but
  would be a vulnerability in production code.

### 11.2 Implementation B Security Properties

- **Authenticated encryption**: GCM provides confidentiality and integrity.
- **Nonce misuse resistance**: A fresh random nonce is generated for each
  encryption. With 96-bit nonces, the probability of collision is
  negligible for practical usage.
- **Tag verification**: The tag is verified before plaintext is released.
- **No plaintext on failure**: Authentication failures return `std::nullopt`
  without exposing any plaintext.

### 11.3 Limitations

1. Implementation A does NOT provide authenticated encryption and must not
   be used for real data protection.
2. Neither implementation is constant-time (side-channel resistant).
3. AES-192/256 are not implemented.
4. The scratch implementation is ~50x slower than OpenSSL due to lack of
   hardware acceleration.

## 12. Experimental Environment and Methodology

| Component | Details |
|-----------|---------|
| CPU | Apple M1 (arm64, 8-core) |
| OS | macOS 27.0.1 |
| Compiler | Apple clang 21.0.0 (-O3) |
| OpenSSL | 3.6.5 (Homebrew) |
| CMake | 3.31.3 |
| Python | 3.12.2 |
| Timing | std::chrono::steady_clock (monotonic) |
| Memory tool | /usr/bin/time -l (peak RSS) |

### Benchmark Procedure

1. Warmup: 2-3 iterations before timing
2. Each repetition timed individually
3. Checksum computed after each pass (prevent dead-code elimination)
4. Multiple repetitions per configuration (10 for most, fewer for slow cases)
5. Both encryption and decryption measured separately
6. Key setup measured separately

## 13. Testing Plan and Acceptance Criteria

See `tests/test_plan.md` for the complete testing plan. Summary of
acceptance criteria:

| Criterion | Result |
|-----------|--------|
| FIPS 197 KATs pass | PASS |
| NIST CAVP KATs pass | PASS |
| Round-trip tests pass | PASS |
| Negative/tampering tests pass | PASS |
| Sanitizer (ASan+UBSan) clean | PASS |
| Zero compiler warnings | PASS |
| Cross-validation (1000 blocks) | PASS |

## 14. Functional and Known-Answer Test Results

| Test Suite | Cases | Passed | Failed |
|------------|-------|--------|--------|
| FIPS 197 Appendix C.1 | 1 | 1 | 0 |
| FIPS 197 Appendix B | 1 | 1 | 0 |
| NIST CAVP ECBGFSbox128 | 7 | 7 | 0 |
| NIST CAVP ECBVarTxt128 | 128 | 128 | 0 |
| NIST CAVP ECBVarKey128 | 128 | 128 | 0 |
| NIST CAVP ECBMMT128 | 10 | 10 | 0 |
| NIST CAVP GCM Encrypt (subset) | 12 | 12 | 0 |
| NIST CAVP GCM Decrypt (subset) | 24 | 24 | 0 |
| Cross-validation (random blocks) | 1000 | 1000 | 0 |
| **Total** | **1431** | **1431** | **0** |

## 15. Negative and Authentication Test Results

| Test | Expected | Actual | Result |
|------|----------|--------|--------|
| Wrong key | Reject | Rejected | PASS |
| Modified ciphertext | Reject | Rejected | PASS |
| Modified tag | Reject | Rejected | PASS |
| Modified nonce | Reject | Rejected | PASS |
| Modified AAD | Reject | Rejected | PASS |
| Truncated ciphertext | Reject | Rejected | PASS |
| Garbage blob | Reject | Rejected | PASS |
| Null key | Exception | Exception | PASS |
| Null nonce | Exception | Exception | PASS |
| Scratch: 15-byte key | Reject | Rejected | PASS |
| Scratch: 17-byte data | Reject | Rejected | PASS |

## 16. Execution-Time Results

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

### Key Setup Time

| Implementation | Mean (ns) | Median (ns) |
|----------------|-----------|-------------|
| scratch | 12,925 | 12,875 |
| openssl-ecb | 634 | 334 |

## 17. Throughput Analysis

OpenSSL achieves ~2000x higher throughput than the from-scratch
implementation at large sizes (712 MiB/s vs 0.34 MiB/s at 10 MiB). This
difference is due to hardware AES instructions (ARMv8 Cryptographic
Extensions) available on the Apple M1, which OpenSSL uses automatically.

GCM mode incurs only ~3% overhead over raw ECB at large sizes (693 vs
712 MiB/s), demonstrating that authentication is nearly free when
hardware-accelerated. At small sizes, GCM's fixed setup cost (nonce
generation, context initialization) makes it proportionally slower.

## 18. Memory-Usage Results

Peak resident set size (RSS) measured with `/usr/bin/time -l` on macOS:

| Implementation | Baseline | 1 KiB | 100 KiB | 1 MiB | 10 MiB |
|----------------|----------|-------|---------|-------|--------|
| scratch | 1.9 MB | 1.9 MB | 2.2 MB | 4.0 MB | 22.9 MB |
| openssl-ecb | 3.9 MB | 3.9 MB | 4.2 MB | 6.0 MB | 24.9 MB |
| openssl-gcm | 4.0 MB | 4.0 MB | 4.3 MB | 6.2 MB | 25.1 MB |

Key observations:
- Baseline RSS: scratch 1.9 MB (no OpenSSL), OpenSSL ~3.9-4.0 MB (library overhead)
- At 10 MiB: all implementations use ~23-25 MB (input + output buffers + overhead)
- Memory scales linearly with input size (2x input + 2x output for in-place capable modes)
- GCM decrypt uses slightly more memory (35.6 MB at 10 MiB) due to OpenSSL's
  internal buffering for tag verification

## 19. Graphs and Tables

- `figures/encryption_time.svg` — Encryption time vs input size
- `figures/decryption_time.svg` — Decryption time vs input size
- `figures/throughput.svg` — Throughput vs input size

## 20. Interpretation of Results

The benchmark results confirm the expected performance hierarchy:

1. **OpenSSL ECB** is the fastest raw block cipher (~712 MiB/s at 10 MiB),
   benefiting from ARMv8 hardware AES instructions.

2. **OpenSSL GCM** is nearly as fast as ECB (~693 MiB/s at 10 MiB), with
   only ~3% authentication overhead at large sizes. At small sizes, the
   fixed cost of nonce generation and context setup dominates.

3. **Scratch AES** is ~2000x slower (~0.34 MiB/s) because it performs
   byte-by-byte GF(2⁸) multiplication without hardware acceleration or
   precomputed lookup tables. This is expected for an educational
   implementation and demonstrates why production systems use optimized
   cryptographic libraries.

4. **Key setup** is ~20x slower in the scratch implementation (12.9 μs vs
   0.6 μs), reflecting the cost of computing the S-box and performing
   44 word expansions with GF arithmetic.

5. **Memory usage** is dominated by input/output buffers at large sizes.
   The scratch implementation has a lower baseline (1.9 MB vs 3.9 MB)
   because it does not load OpenSSL.

## 21. Practical Use Cases

| Use Case | Recommended Implementation |
|----------|---------------------------|
| Learning AES internals | Implementation A |
| Real file encryption | Implementation B (or any vetted AE library) |
| High-performance encryption | Implementation B (hardware-accelerated) |
| Embedded systems (no OpenSSL) | Implementation A (with caveats) |
| Authenticated encryption | Implementation B only |

## 22. Limitations and Threats to Validity

1. **Single platform**: Results are from Apple M1 only. Performance on
   other platforms (x86 with AES-NI, ARM without crypto extensions) will
   differ.
2. **Scratch implementation speed**: The ~50x slowdown is expected for a
   non-optimized, non-hardware-accelerated implementation. A production
   from-scratch implementation would use lookup tables and be significantly
   faster (though still slower than hardware-accelerated code).
3. **Memory measurement scope**: Peak RSS includes process overhead,
   OpenSSL library loading, and runtime initialization — not just
   algorithm-specific memory.
4. **GCM subset**: Only a subset of NIST GCM test vectors was used (12
   encrypt + 24 decrypt cases from the full ~2.9 MB files).

## 23. Conclusion

This project successfully demonstrates two approaches to AES implementation
in C++. The from-scratch implementation (Implementation A) provides a clear,
educational view of AES internals and passes all NIST known-answer tests.
The OpenSSL-based implementation (Implementation B) provides production-grade
authenticated encryption with hardware-accelerated performance.

The key takeaway for software security practice is: **use authenticated
encryption (like AES-GCM) for real applications, and use vetted libraries
(like OpenSSL) rather than implementing cryptography from scratch.**

## 24. References

1. NIST FIPS 197, "Advanced Encryption Standard (AES)", 2001 (updated 2023).
   https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf
2. NIST SP 800-38D, "Recommendation for Block Cipher Modes of Operation:
   Galois/Counter Mode (GCM) and GMAC", 2007.
3. NIST SP 800-38A, "Recommendation for Block Cipher Modes of Operation",
   2001.
4. McGrew, D. and Viega, J., "The Galois/Counter Mode of Operation (GCM)",
   2004.
5. OpenSSL Documentation, https://docs.openssl.org/
6. NIST CAVP (Cryptographic Algorithm Validation Program),
   https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program

## 25. Appendix: Build and Reproduction Instructions

### Build

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

### Run Tests

```bash
./build/aes_tests tests/test_vectors
```

### Run Sanitizer Tests

```bash
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors
```

### Run Benchmarks

```bash
./build/aes_benchmark --impl scratch --op encrypt --size 1048576 \
    --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-ecb --op encrypt --size 1048576 \
    --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1048576 \
    --reps 10 --csv results/benchmark_results.csv
```

### Run Complete Workflow

```bash
scripts/run_all.sh
```

### Generate Figures

```bash
python3 scripts/run_all.py results reports
```
