# Testing Strategy

## Overview

The AES Comparison Project employs a multi-layered testing strategy encompassing unit tests, integration tests, end-to-end tests, regression tests, sanitizer tests, and security tests. The test suite is implemented in `src/test_main.cpp` and uses a minimal custom test framework with 1,431 total checks.

---

## Test Categories

### A. Known-Answer Tests (KAT)

Known-answer tests verify that the implementations produce correct output for predefined input/output pairs from NIST standards.

| Test | Source | Cases | What It Verifies |
|---|---|---|---|
| FIPS 197 Appendix C.1 | FIPS 197 standard | 1 | Basic AES-128 encrypt/decrypt with published vector |
| FIPS 197 Appendix B | FIPS 197 standard | 1 | Key expansion and encryption with published vector |
| Key Expansion | FIPS 197 §5.2 | 3 checks | Round key 0, w[4], and final round key match spec |
| Individual Transformations | FIPS 197 §3/§4 | 10 checks | S-box values, bijection, MixColumns, ShiftRows, AddRoundKey |
| NIST CAVP ECBGFSbox128 | NIST CAVP | 7 | ECB encryption with varying S-box inputs |
| NIST CAVP ECBVarTxt128 | NIST CAVP | 128 | ECB encryption with varying plaintext |
| NIST CAVP ECBVarKey128 | NIST CAVP | 128 | ECB encryption with varying keys |
| NIST CAVP ECBMMT128 | NIST CAVP | 10 | Multi-block ECB encryption |
| NIST CAVP GCM Encrypt | NIST CAVP (subset) | 12 | GCM encryption with fixed IV |
| NIST CAVP GCM Decrypt | NIST CAVP (subset) | 24 | GCM decryption incl. 13 official FAIL cases |

**Total KAT cases: 282**

### B. Round-Trip Tests

Round-trip tests verify that encryption followed by decryption recovers the original plaintext.

| Test | Implementation | Cases | Sizes Tested |
|---|---|---|---|
| Scratch ECB round-trip | Implementation A | 5 + 3 special | 16 B, 32 B, 160 B, 1 KiB, 1 MiB + zeros, ASCII, UTF-8 |
| OpenSSL GCM round-trip | Implementation B | 12 | 0 B to 10 MiB (12 sizes) |

Special content tests:
- All-zero bytes (256 bytes)
- ASCII text ("The quick brown fox...")
- UTF-8 text with multi-byte sequences

### C. Boundary Tests

Boundary tests verify correct behavior at size extremes.

| Test | Description |
|---|---|
| GCM boundary sizes | 12 sizes: 0, 1, 15, 16, 17, 31, 32, 33, 1024, 100 KiB, 1 MiB, 10 MiB |
| Scratch non-block rejection | 17-byte input rejected (no silent padding) |
| Scratch block acceptance | 16-byte input accepted |

### D. Negative / Tampering Tests

Negative tests verify that invalid inputs and tampered ciphertext are properly rejected.

| Test | Expected Behavior |
|---|---|
| Wrong key | Authentication failure (nullopt) |
| Modified ciphertext (1 bit flip) | Authentication failure |
| Modified tag (1 bit flip) | Authentication failure |
| Modified nonce (1 bit flip) | Authentication failure |
| Modified AAD | Authentication failure |
| Truncated ciphertext | Authentication failure |
| Garbage blob (3 bytes) | Authentication failure |
| Null key | OperationError exception |
| Null nonce | OperationError exception |
| 15-byte key (scratch) | Rejected |
| 17-byte key (scratch) | Rejected |
| Null key pointer (scratch) | Rejected |

### E. Cross-Validation Tests

Cross-validation compares the scratch implementation against OpenSSL on identical inputs.

- **1,000 random blocks** encrypted with both implementations
- **0 mismatches** expected
- Uses OpenSSL ECB with padding disabled for apples-to-apples comparison

### F. Determinism / Regression Tests

| Test | What It Verifies |
|---|---|
| Scratch encryption determinism | Same key + same block = same ciphertext |
| GCM determinism (fixed nonce) | Same key + nonce + plaintext = same ciphertext + tag |
| Nonce uniqueness | Different nonces produce different ciphertexts |

---

## Test Framework

The test suite uses a minimal custom framework (no external dependency):

```cpp
int g_checks = 0;
int g_failures = 0;

void check(bool condition, const std::string& what);
void check_eq(const std::string& actual, const std::string& expected,
              const std::string& what);
```

- **Exit code 0**: All tests passed
- **Exit code 1**: One or more tests failed
- **Reproducible**: Fixed seed `0xAE5128` for `std::mt19937_64`

---

## Sanitizer Testing

### AddressSanitizer (ASan) + UndefinedBehaviorSanitizer (UBSan)

```bash
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors
```

Sanitizers detect:
- **ASan**: Heap buffer overflow, use-after-free, stack buffer overflow, memory leaks
- **UBSan**: Signed integer overflow, misaligned access, null pointer dereference, undefined behavior

**Result**: Both sanitizer runs pass with 0 failures across all 1,431 checks.

---

## Security Testing

### Authentication Boundary Testing

The GCM implementation is tested against all tampering vectors:

1. **Ciphertext modification**: Any bit flip in ciphertext must cause authentication failure
2. **Tag modification**: Any bit flip in tag must cause authentication failure
3. **Nonce modification**: Any bit flip in nonce must cause authentication failure
4. **AAD modification**: Any change to additional authenticated data must cause authentication failure
5. **Truncation**: Truncated ciphertext must be rejected
6. **Wrong key**: Decryption with wrong key must fail

### NIST CAVP FAIL Cases

The GCM decrypt test suite includes 13 official NIST FAIL cases — test vectors specifically designed to produce authentication failures. All 13 are correctly rejected.

---

## Regression Testing

### Determinism Checks

- Scratch encryption is deterministic (same input = same output)
- GCM encryption with fixed nonce is deterministic (test-only; production must use fresh nonces)
- Different nonces produce different ciphertexts

### Cross-Validation Regression

The 1,000-block cross-validation test ensures that any future change to the scratch implementation that breaks correctness will be caught immediately.

---

## Test Execution

### Quick Test Run

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/aes_tests tests/test_vectors
```

### Sanitizer Test Run

```bash
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors
```

### Complete Workflow

```bash
scripts/run_all.sh
```

This runs: build, test, sanitizer test, benchmark, memory profiling, aggregation, and report generation.

---

## Test Coverage Summary

| Layer | Tests | Count |
|---|---|---|
| Unit (KAT) | FIPS 197 + NIST CAVP | 282 |
| Unit (transformations) | S-box, MixColumns, ShiftRows, AddRoundKey | 10 |
| Integration (round-trip) | Scratch ECB + OpenSSL GCM | 17 |
| Boundary | Size extremes | 14 |
| Negative | Invalid input + tampering | 36 |
| Cross-validation | Scratch vs OpenSSL | 1,000 |
| Determinism | Reproducibility | 5 |
| **Total** | | **1,431** |

---

## Acceptance Criteria

| Criterion | Result |
|---|---|
| FIPS 197 KATs pass | PASS |
| NIST CAVP KATs pass | PASS |
| Round-trip tests pass | PASS |
| Negative/tampering tests pass | PASS |
| Sanitizer (ASan+UBSan) clean | PASS |
| Zero compiler warnings | PASS |
| Cross-validation (1,000 blocks) | PASS |
| Determinism checks | PASS |
