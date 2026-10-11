# Test Evidence

## Overview

This document provides verifiable evidence of test execution results for the AES Comparison Project. All data is sourced from actual test runs recorded in the `results/` directory.

---

## Test Execution Summary

| Metric | Value |
|---|---|
| Total checks | 1,431 |
| Failures | 0 |
| Pass rate | 100% |
| Test binary | `aes_tests` |
| Vectors directory | `tests/test_vectors` |
| Test framework | Custom (test_main.cpp) |
| RNG seed | `0xAE5128` (fixed, reproducible) |

---

## Detailed Test Results

### A. Known-Answer Tests

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| A1. FIPS 197 Appendix C.1 KAT | 1 | 1 | 0 |
| A2. FIPS 197 Appendix B KAT | 1 | 1 | 0 |
| A3. Key expansion (FIPS 197 §5.2) | 3 checks | 3 | 0 |
| A4. Individual transformations | 10 checks | 10 | 0 |
| A5. NIST CAVP ECBGFSbox128 | 7 | 7 | 0 |
| A5. NIST CAVP ECBVarTxt128 | 128 | 128 | 0 |
| A5. NIST CAVP ECBVarKey128 | 128 | 128 | 0 |
| A6. NIST CAVP ECBMMT128 | 10 | 10 | 0 |
| **Subtotal** | **288** | **288** | **0** |

### B. Round-Trip Tests

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| B1. Round-trip: scratch AES-128 (ECB validation) | 5 sizes + 3 special | 8 | 0 |
| B2. Round-trip: OpenSSL AES-128-GCM | 12 sizes | 12 | 0 |
| **Subtotal** | **20** | **20** | **0** |

### C. Boundary Tests

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| C1. Boundary sizes: OpenSSL AES-128-GCM | 12 sizes | 12 | 0 |
| C2. Boundary: scratch rejects non-block-multiple | 2 | 2 | 0 |
| **Subtotal** | **14** | **14** | **0** |

### D. Negative / Tampering Tests

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| D1. Negative: scratch invalid input | 5 | 5 | 0 |
| D2. Negative: OpenSSL GCM tampering | 10 | 10 | 0 |
| D3. NIST CAVP GCM encrypt KATs | 12 | 12 | 0 |
| D4. NIST CAVP GCM decrypt KATs (incl. 13 FAIL cases) | 24 | 24 | 0 |
| **Subtotal** | **51** | **51** | **0** |

### E. Cross-Validation

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| E1. Cross-validation: scratch vs OpenSSL | 1,000 blocks | 1,000 | 0 |
| **Subtotal** | **1,000** | **1,000** | **0** |

### F. Determinism

| Test Section | Cases | Passed | Failed |
|---|---|---|---|
| F1. Determinism and nonce uniqueness | 5 | 5 | 0 |
| **Subtotal** | **5** | **5** | **0** |

---

## Sanitizer Test Results

| Metric | Value |
|---|---|
| Sanitizers | ASan + UBSan |
| Build type | Debug |
| Total checks | 1,431 |
| Failures | 0 |
| Result | ALL TESTS PASSED |

The sanitizer run produces identical results to the normal run, confirming:
- No memory leaks (ASan)
- No buffer overflows (ASan)
- No undefined behavior (UBSan)
- No use-after-free (ASan)

---

## Test Commands and Exit Codes

### Standard Test Run

```bash
$ ./build/aes_tests tests/test_vectors
# Exit code: 0
# Output: RESULT: ALL TESTS PASSED
```

### Sanitizer Test Run

```bash
$ ./build-san/aes_tests tests/test_vectors
# Exit code: 0
# Output: RESULT: ALL TESTS PASSED
```

### Expected Output Format

```
AES Comparison Test Suite
Vectors directory: tests/test_vectors

=== A1. FIPS 197 Appendix C.1 KAT (scratch AES-128) ===

=== A2. FIPS 197 Appendix B KAT (scratch AES-128) ===

=== A3. Key expansion (FIPS 197 §5.2) ===

=== A4. Individual transformations (FIPS 197 §3/§4) ===

=== A5. NIST CAVP ECBGFSbox128 (scratch AES-128 ECB) ===
  7/7 cases passed

=== A5. NIST CAVP ECBVarTxt128 (scratch AES-128 ECB) ===
  128/128 cases passed

=== A5. NIST CAVP ECBVarKey128 (scratch AES-128 ECB) ===
  128/128 cases passed

=== A6. NIST CAVP ECBMMT128 multi-block (scratch ECB validation) ===
  10/10 cases passed

=== B1. Round-trip: scratch AES-128 (ECB validation) ===

=== B2. Round-trip: OpenSSL AES-128-GCM ===

=== C1. Boundary sizes: OpenSSL AES-128-GCM ===

=== C2. Boundary: scratch block cipher rejects non-block-multiple input ===

=== D1. Negative: scratch implementation invalid input ===

=== D2. Negative: OpenSSL AES-128-GCM tampering ===

=== D3. NIST CAVP GCM encrypt KATs (OpenSSL AES-128-GCM) ===
  12/12 cases passed

=== D4. NIST CAVP GCM decrypt KATs incl. FAIL cases (OpenSSL) ===
  24/24 cases passed (13 official FAIL cases)

=== E1. Cross-validation: scratch AES-128 vs OpenSSL AES-128-ECB ===
  1000 random blocks compared, 0 mismatches

=== F1. Determinism and nonce uniqueness ===

========================================
Total checks: 1431
Failures:     0
RESULT: ALL TESTS PASSED
```

---

## Test Vector Provenance

| File | Source | Purpose |
|---|---|---|
| `ECBGFSbox128.rsp` | NIST CAVP | ECB encryption with varying S-box inputs |
| `ECBVarTxt128.rsp` | NIST CAVP | ECB encryption with varying plaintext |
| `ECBVarKey128.rsp` | NIST CAVP | ECB encryption with varying keys |
| `ECBMMT128.rsp` | NIST CAVP | Multi-block ECB encryption |
| `gcmEncryptExtIV128_subset.rsp` | NIST CAVP (subset) | GCM encryption with fixed IV |
| `gcmDecrypt128_subset.rsp` | NIST CAVP (subset) | GCM decryption incl. FAIL cases |

See `tests/test_vectors/PROVENANCE.md` for detailed provenance information.

---

## Reproducibility

All test results are reproducible:

1. **Fixed RNG seed**: `std::mt19937_64 rng(0xAE5128)` ensures identical random inputs across runs
2. **Deterministic test order**: Tests run in fixed sequence (A through F)
3. **No external dependencies**: Test vectors are local files, no network access required
4. **Exit code contract**: 0 = all pass, 1 = any failure

---

## Timestamp

| Run | Date | Result |
|---|---|---|
| Standard test run | 2026-10-11 | 1,431/1,431 passed |
| Sanitizer test run | 2026-10-11 | 1,431/1,431 passed |

---

## Related Documentation

- `tests/test_plan.md` — Complete test plan with acceptance criteria
- `results/test_results.txt` — Raw test output
- `results/sanitizer_test_results.txt` — Sanitizer test output
- `reports/final_report.md` — Technical report with test summary
