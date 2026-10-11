# Known Limitations

## Overview

This document catalogs all known limitations of both implementations and the testing infrastructure. Each limitation is documented with its impact and recommended mitigation.

---

## Implementation A: Scratch AES-128

### L-A01: No Authentication

| Aspect | Details |
|---|---|
| **Limitation** | The scratch implementation is a raw block cipher — it provides no authentication or integrity protection |
| **Impact** | Ciphertext can be modified without detection. Any tampering is invisible to the decryptor. |
| **Mitigation** | Use Implementation B (OpenSSL AES-128-GCM) for any real encryption. The scratch implementation is for education and validation only. |
| **Status** | Documented design decision — not a bug |

### L-A02: ECB Mode Leaks Patterns

| Aspect | Details |
|---|---|
| **Limitation** | The multi-block helper applies ECB mode — identical plaintext blocks produce identical ciphertext blocks |
| **Impact** | Plaintext patterns are visible in ciphertext. For example, an image encrypted with ECB still shows its outline. |
| **Mitigation** | Use a proper mode (GCM, CBC, CTR) for real encryption. ECB is used only for NIST test vector validation. |
| **Status** | Documented design decision — not a bug |

### L-A03: Not Constant-Time

| Aspect | Details |
|---|---|
| **Limitation** | The byte-by-byte GF(2^8) multiplication is not constant-time |
| **Impact** | Timing side-channel attacks could potentially recover the key |
| **Mitigation** | Use OpenSSL (hardware-accelerated, constant-time) for production. The scratch implementation is for educational use only. |
| **Status** | Documented limitation |

### L-A04: No Padding

| Aspect | Details |
|---|---|
| **Limitation** | Input must be a multiple of 16 bytes; no padding is performed |
| **Impact** | Data that is not block-aligned cannot be encrypted |
| **Mitigation** | The caller is responsible for padding (e.g., PKCS#7) if needed. For real encryption, use GCM which is a stream mode. |
| **Status** | Documented design decision — reduces code complexity |

### L-A05: AES-128 Only

| Aspect | Details |
|---|---|
| **Limitation** | Only AES-128 (128-bit key, 10 rounds) is implemented |
| **Impact** | AES-192 and AES-256 are not available |
| **Mitigation** | Use OpenSSL for AES-192/256. AES-128 is the minimum required for this project. |
| **Status** | Scope limitation — by design |

### L-A06: Performance

| Aspect | Details |
|---|---|
| **Limitation** | The scratch implementation is approximately 2000x slower than OpenSSL at large sizes (0.34 MiB/s vs 712 MiB/s at 10 MiB) |
| **Impact** | Not suitable for encrypting large data in production |
| **Mitigation** | Use OpenSSL for production. The scratch implementation is for education and validation. |
| **Status** | Expected — no hardware acceleration, no lookup tables |

---

## Implementation B: OpenSSL AES-128-GCM

### L-B01: AES-128 Only

| Aspect | Details |
|---|---|
| **Limitation** | The wrapper is specialized for AES-128-GCM with 96-bit nonces and 128-bit tags |
| **Impact** | Other key sizes, nonce sizes, and tag sizes are not supported |
| **Mitigation** | Use OpenSSL's generic EVP interface directly for other configurations |
| **Status** | Scope limitation — by design |

### L-B02: No Key Derivation

| Aspect | Details |
|---|---|
| **Limitation** | The wrapper expects a raw 128-bit key — no key derivation function (KDF) is provided |
| **Impact** | Callers must provide a properly random key; passphrase-based encryption requires an external KDF (e.g., PBKDF2, Argon2) |
| **Mitigation** | Use a KDF in the application layer before passing the key to this wrapper |
| **Status** | Design decision — KDF is out of scope for a thin wrapper |

### L-B03: No Memory Wiping

| Aspect | Details |
|---|---|
| **Limitation** | Key material and plaintext are not explicitly wiped from memory after use |
| **Impact** | Sensitive data may persist in freed memory |
| **Mitigation** | Use `OPENSSL_cleanse` or platform-specific secure memory zeroing at the application layer |
| **Status** | Low risk for most threat models |

### L-B04: Single-Shot API Only

| Aspect | Details |
|---|---|
| **Limitation** | The wrapper provides single-shot encrypt/decrypt — no streaming/incremental API |
| **Impact** | Very large files must fit in memory |
| **Mitigation** | For large files, use OpenSSL's incremental EVP interface directly |
| **Status** | Scope limitation — by design for simplicity |

---

## Testing Infrastructure

### L-T01: Single Platform

| Aspect | Details |
|---|---|
| **Limitation** | All tests and benchmarks were run on a single platform: Apple M1 (arm64), macOS 27.0.1 |
| **Impact** | Results may not generalize to other platforms (x86 with AES-NI, ARM without crypto extensions, Linux, Windows) |
| **Mitigation** | Run tests on additional platforms before drawing platform-specific conclusions |
| **Status** | Documented limitation |

### L-T02: No Automated CLI Integration Tests

| Aspect | Details |
|---|---|
| **Limitation** | The test suite tests the library APIs but does not include automated integration tests for the CLI tools (`aes_scratch_main`, `aes_openssl_main`) |
| **Impact** | CLI-specific bugs (argument parsing, file I/O) are not caught by automated tests |
| **Mitigation** | Add CLI integration tests that invoke the binaries and verify output |
| **Status** | Identified gap — see `docs/implementation-audit.md` |

### L-T03: GCM Test Vector Subset

| Aspect | Details |
|---|---|
| **Limitation** | Only a subset of NIST GCM test vectors was used (12 encrypt + 24 decrypt cases from the full approximately 2.9 MB files) |
| **Impact** | Some edge cases in the full GCM test suite are not covered |
| **Mitigation** | Use the full GCM test vector files for more comprehensive validation |
| **Status** | Documented limitation — subset was sufficient for correctness validation |

### L-T04: No Fuzz Testing

| Aspect | Details |
|---|---|
| **Limitation** | No fuzz testing (e.g., libFuzzer, AFL) is performed |
| **Impact** | Unexpected input handling is only tested for known edge cases |
| **Mitigation** | Add fuzz testing with structured and unstructured input |
| **Status** | Identified gap |

### L-T05: No Mutation Testing

| Aspect | Details |
|---|---|
| **Limitation** | Mutation testing (introducing small code changes to verify test sensitivity) is not performed |
| **Impact** | Test suite sensitivity to code changes is not measured |
| **Mitigation** | Add mutation testing (e.g., using Mull or custom tooling) |
| **Status** | Identified gap |

### L-T06: Memory Measurement Scope

| Aspect | Details |
|---|---|
| **Limitation** | Peak RSS measurements include process overhead, OpenSSL library loading, and runtime initialization — not just algorithm-specific memory |
| **Impact** | Memory comparisons between implementations include fixed overhead |
| **Mitigation** | Baseline subtraction partially accounts for this; document the measurement scope |
| **Status** | Documented limitation |

### L-T07: No Concurrent/Parallel Testing

| Aspect | Details |
|---|---|
| **Limitation** | Tests are single-threaded; no concurrent or parallel execution is tested |
| **Impact** | Thread safety is not verified |
| **Mitigation** | The implementations use no shared mutable state, so thread safety is expected but not tested |
| **Status** | Identified gap |

---

## Documentation Limitations

### L-D01: No Git Version Control

| Aspect | Details |
|---|---|
| **Limitation** | The project is not yet under git version control |
| **Impact** | No change history, no code review process, no CI integration |
| **Mitigation** | Initialize git repository with granular commit history |
| **Status** | Identified gap |

### L-D02: No CI Pipeline

| Aspect | Details |
|---|---|
| **Limitation** | No GitHub Actions or other CI pipeline is configured |
| **Impact** | Tests are not automatically run on every change |
| **Mitigation** | Add GitHub Actions CI with build, test, sanitizer, and benchmark jobs |
| **Status** | Identified gap |

---

## Summary Table

| ID | Limitation | Component | Severity | Status |
|---|---|---|---|---|
| L-A01 | No authentication | Implementation A | Critical | Documented |
| L-A02 | ECB leaks patterns | Implementation A | High | Documented |
| L-A03 | Not constant-time | Implementation A | High | Documented |
| L-A04 | No padding | Implementation A | Low | Documented |
| L-A05 | AES-128 only | Both | Low | Scope |
| L-A06 | Slow performance | Implementation A | Medium | Expected |
| L-B01 | AES-128-GCM only | Implementation B | Low | Scope |
| L-B02 | No key derivation | Implementation B | Low | Design |
| L-B03 | No memory wiping | Both | Low | Accepted |
| L-B04 | Single-shot API only | Implementation B | Low | Design |
| L-T01 | Single platform | Testing | Medium | Documented |
| L-T02 | No CLI integration tests | Testing | Medium | Gap |
| L-T03 | GCM subset only | Testing | Low | Documented |
| L-T04 | No fuzz testing | Testing | Medium | Gap |
| L-T05 | No mutation testing | Testing | Low | Gap |
| L-T06 | Memory measurement scope | Testing | Low | Documented |
| L-T07 | No concurrent testing | Testing | Low | Gap |
| L-D01 | No git version control | Docs | Medium | Gap |
| L-D02 | No CI pipeline | Docs | Medium | Gap |
