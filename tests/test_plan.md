# Test Plan — AES Implementation Comparison

## 1. Testing Objectives

1. Verify that the from-scratch AES-128 implementation produces correct
   results against authoritative NIST test vectors.
2. Verify that the OpenSSL AES-128-GCM implementation correctly encrypts,
   decrypts, and rejects tampered data.
3. Confirm that both implementations agree on raw block-cipher output
   (cross-validation).
4. Validate boundary conditions (empty input, non-block-multiple input).
5. Confirm that authentication failures are detected and no plaintext is
   released.
6. Measure and compare performance (throughput, latency, memory) of both
   implementations.

## 2. Scope and Limitations

### In Scope

- AES-128 block cipher correctness (FIPS 197 known-answer tests)
- AES-128-GCM authenticated encryption (NIST CAVP test vectors)
- Round-trip correctness for sizes 0 B to 10 MB
- Negative/tampering tests (wrong key, modified ciphertext/tag/nonce/AAD)
- Performance benchmarking (encryption, decryption, key setup)
- Memory usage measurement (peak RSS)

### Out of Scope

- AES-192 and AES-256 key sizes (AES-128 is the minimum required)
- Hardware-specific constant-time analysis
- Side-channel resistance testing
- The scratch implementation does NOT provide authenticated encryption
  (documented limitation)

## 3. Test Environment

| Component | Version/Details |
|-----------|----------------|
| OS | macOS 27.0.1 (Apple M1, arm64) |
| C++ Compiler | Apple clang 21.0.0 |
| CMake | 3.31.3 |
| OpenSSL | 3.6.5 (Homebrew) |
| Python | 3.12.2 |
| Build type | Release (-O3), Debug (sanitizers) |

## 4. Functional Testing

### 4.1 Known-Answer Tests (KATs)

| Test | Source | Count |
|------|--------|-------|
| FIPS 197 Appendix C.1 | NIST FIPS 197 | 1 |
| FIPS 197 Appendix B | NIST FIPS 197 | 1 |
| NIST CAVP ECBGFSbox128 | NIST CAVS 11.1 | 7 |
| NIST CAVP ECBVarTxt128 | NIST CAVS 11.1 | 128 |
| NIST CAVP ECBVarKey128 | NIST CAVS 11.1 | 128 |
| NIST CAVP ECBMMT128 | NIST CAVS 11.1 | 10 |
| NIST CAVP GCM Encrypt (subset) | NIST CAVS 14.0 | 12 |
| NIST CAVP GCM Decrypt (subset, incl. FAIL) | NIST CAVS 14.0 | 24 |

### 4.2 Key Expansion Tests

- Verify round key 0 equals the original key
- Verify w[4] = a0fafe17 (FIPS 197 §5.2)
- Verify round key 10 = d014f9a8c9ee2589e13f0cc8b6630ca6 (FIPS 197 §5.2)

### 4.3 Transformation Tests

- SubBytes spot values: S(00)=63, S(01)=7c, S(53)=ed
- S-box bijectivity and inverse consistency
- MixColumns: {db,13,53,45} → {8e,4d,a1,bc} (FIPS 197 §4.3)
- ShiftRows permutation correctness
- AddRoundKey self-inverse property
- InvMixColumns inverts MixColumns
- InvShiftRows inverts ShiftRows

## 5. Round-Trip Tests

| Implementation | Sizes Tested |
|----------------|-------------|
| Scratch (ECB validation) | 16 B, 32 B, 160 B, 1 KiB, 1 MiB |
| OpenSSL GCM | 0 B, 1 B, 15 B, 16 B, 17 B, 31 B, 32 B, 33 B, 1 KiB, 100 KiB, 1 MiB, 10 MiB |

Special content: all-zero bytes, ASCII text, UTF-8 text (multi-byte sequences).

## 6. Boundary Tests

- GCM: all sizes listed above (GCM supports arbitrary lengths including empty)
- Scratch: 16-byte block requirement enforced; 17-byte input rejected (no silent padding)

## 7. Negative and Security Tests

| Test | Expected Behavior |
|------|-------------------|
| Wrong key | Authentication failure, no plaintext returned |
| Modified ciphertext (1 bit flip) | Authentication failure |
| Modified tag (1 bit flip) | Authentication failure |
| Modified nonce | Authentication failure |
| Modified AAD | Authentication failure |
| Truncated ciphertext | Authentication failure |
| Garbage/empty blob | Rejected |
| Null key pointer | Exception thrown (OperationError) |
| Null nonce pointer | Exception thrown (OperationError) |
| Scratch: 15-byte key | expand_key returns false |
| Scratch: 17-byte key | expand_key returns false |
| Scratch: 17-byte data | ECB validate returns false |

## 8. Regression Testing

- All tests use fixed random seed (0xAE5128) for reproducibility
- Determinism verified: same input + same key → same output
- Tests run identically in Release and Debug (sanitizer) builds

## 9. Sanitizer Testing

- AddressSanitizer (ASan): detects heap/stack buffer overflows, use-after-free
- UndefinedBehaviorSanitizer (UBSan): detects undefined behavior
- LeakSanitizer (part of ASan on macOS): detects memory leaks
- Run on full test suite (all 1400+ checks)

## 10. Performance Testing

### 10.1 Benchmark Configuration

- Input sizes: 16 B, 1 KiB, 100 KiB, 1 MiB, 10 MiB
- Repetitions: 10 (fewer for scratch at large sizes due to ~50x slowdown)
- Warmup: 2-3 iterations
- Timing: std::chrono::steady_clock (monotonic, nanosecond resolution)
- Compiler optimizations enabled (Release build, -O3)
- Checksum verification after each pass to prevent dead-code elimination

### 10.2 Metrics

- Encryption/decryption time (ns, ms)
- Throughput (MiB/s)
- Key setup time
- Scaling behavior (time vs input size)
- Performance ratio (OpenSSL / scratch)

## 11. Memory Testing

- Platform: macOS
- Tool: /usr/bin/time -l (maximum resident set size, bytes)
- Baseline: process with minimal workload
- Sizes: 1 KiB, 100 KiB, 1 MiB, 10 MiB
- Each measurement in a fresh process

## 12. Pass/Fail Criteria

| Criterion | Requirement |
|-----------|-------------|
| FIPS 197 KATs | All pass |
| NIST CAVP KATs | All pass |
| Round-trip tests | All pass |
| Negative/tampering tests | All correctly rejected |
| Sanitizer | Zero findings |
| Compiler warnings | Zero warnings (-Wall -Wextra -Wpedantic) |
| Cross-validation | 1000/1000 blocks match |

## 13. Test Execution Procedure

```sh
# Build
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j

# Run tests
./build/aes_tests tests/test_vectors

# Sanitizer build and run
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors

# Complete workflow
scripts/run_all.sh
```

## 14. Actual Test Results

See `results/test_results.txt` for the full output. Summary:

- Total checks: 1431
- Failures: 0
- Result: ALL TESTS PASSED

## 15. Failed Tests and Resolutions

None. All tests pass on first run after fixing initial compilation issues
(missing include, hex escape parsing, .rsp format variations).

## 16. Remaining Issues and Limitations

1. The scratch implementation does NOT provide authenticated encryption
   (documented design decision; use OpenSSL GCM for real encryption).
2. AES-192/256 not implemented (AES-128 is the minimum required).
3. Memory measurements include process overhead (OpenSSL library loading,
   runtime initialization), not just algorithm-specific memory.
4. The scratch implementation is ~50x slower than OpenSSL on this platform
   (no AES hardware acceleration in the C++ code; OpenSSL uses AES-NI).
