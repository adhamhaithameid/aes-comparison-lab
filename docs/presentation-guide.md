# Presentation Guide

## Overview

This guide provides a structured approach to presenting the AES Comparison Project in a 10-15 minute talk. It includes a slide outline, demo script, preparation checklist, and Q&A preparation.

---

## Presentation Structure (10-15 minutes)

| Section | Time | Slides |
|---|---|---|
| Introduction | 1-2 min | 1-2 |
| AES Fundamentals | 2-3 min | 3-5 |
| Implementation A: Scratch AES | 2-3 min | 6-8 |
| Implementation B: OpenSSL GCM | 2-3 min | 9-11 |
| Test Results | 1-2 min | 12-13 |
| Performance Results | 1-2 min | 14-15 |
| Security Takeaways | 1 min | 16 |
| Q&A | 2-3 min | — |

---

## Slide Outline

### Slide 1: Title

- **Title**: "AES Implementation Comparison: From-Scratch vs. OpenSSL"
- **Subtitle**: "A Software Security Project"
- **Presenter**: [Your name]
- **Date**: [Date]

### Slide 2: Agenda

1. What is AES?
2. Two implementations
3. Testing & validation
4. Performance comparison
5. Security takeaways

### Slide 3: What is AES?

- **Advanced Encryption Standard** — FIPS 197 (NIST, 2001, updated 2023)
- **Symmetric block cipher** — same key for encrypt and decrypt
- **128-bit blocks**, 128/192/256-bit keys
- **Most widely used** symmetric encryption in the world
- Foundation for securing data at rest and in transit

### Slide 4: AES-128 Round Structure

- 10 rounds of transformation
- Each round: SubBytes, ShiftRows, MixColumns, AddRoundKey
- Final round omits MixColumns
- State: 4x4 byte matrix (column-major)

```
AddRoundKey(0)
for round = 1 to 9:
    SubBytes → ShiftRows → MixColumns → AddRoundKey(round)
SubBytes → ShiftRows → AddRoundKey(10)
```

### Slide 5: Key Expansion

- 128-bit key → 11 round keys (176 bytes)
- Uses RotWord, SubWord, Rcon
- Verified against FIPS 197 §5.2 test vectors

### Slide 6: Implementation A — Scratch AES-128

- **From-scratch C++ implementation** following FIPS 197
- **Programmatic S-box** — computed from GF(2^8) arithmetic, not hardcoded
- **Exposed transformations** — each step is a public method for testing
- **No authentication** — raw block cipher, for education only
- **ECB mode** for multi-block validation (not secure)

### Slide 7: Implementation A — Design Decisions

| Decision | Rationale |
|---|---|
| Programmatic S-box | Eliminates transcription errors |
| Exposed transformations | Enables unit testing and educational tracing |
| No padding | Simplifies code; caller handles alignment |
| ECB for validation | Matches NIST CAVP test vectors |
| No authentication | Documented limitation; use GCM for real data |

### Slide 8: Implementation B — OpenSSL AES-128-GCM

- **Authenticated encryption** — confidentiality + integrity
- **Fresh random nonce** — 96-bit, generated per encryption
- **128-bit tag** — verified before any plaintext is released
- **RAII resource management** — exception-safe OpenSSL contexts
- **Generic errors** — no key material leakage

### Slide 9: Implementation B — Security Properties

- **GCM mode**: CTR encryption + GHASH authentication
- **Tag verification**: `EVP_DecryptFinal_ex` verifies before release
- **No plaintext on failure**: `nullopt` returned, nothing escapes
- **Nonce uniqueness**: fresh random nonce per encryption
- **File format**: `nonce(12) || tag(16) || ciphertext(n)`

### Slide 10: Testing Strategy

- **1,431 total checks** across 6 categories
- **Known-answer tests**: FIPS 197 + NIST CAVP (288 cases)
- **Round-trip tests**: 0 B to 10 MiB (20 cases)
- **Negative tests**: tampering detection (51 cases)
- **Cross-validation**: 1,000 random blocks, 0 mismatches
- **Sanitizers**: ASan + UBSan, 0 findings

### Slide 11: Test Results

| Test Suite | Cases | Passed | Failed |
|---|---|---|---|
| FIPS 197 KATs | 2 | 2 | 0 |
| NIST CAVP ECB | 273 | 273 | 0 |
| NIST CAVP GCM | 36 | 36 | 0 |
| Cross-validation | 1,000 | 1,000 | 0 |
| **Total** | **1,431** | **1,431** | **0** |

### Slide 12: Performance Setup

- **Platform**: Apple M1 (arm64), macOS 27.0.1
- **Compiler**: Apple clang 21.0.0, `-O3`
- **OpenSSL**: 4.0.3 (hardware-accelerated)
- **Input sizes**: 16 B to 10 MiB
- **Timing**: `std::chrono::steady_clock` (ns resolution)

### Slide 13: Throughput Comparison

| Implementation | 1 KiB | 1 MiB | 10 MiB |
|---|---|---|---|
| Scratch | 0.21 MiB/s | 0.26 MiB/s | 0.34 MiB/s |
| OpenSSL ECB | 469 MiB/s | 718 MiB/s | 712 MiB/s |
| OpenSSL GCM | 402 MiB/s | 694 MiB/s | 693 MiB/s |

**Key finding**: OpenSSL is ~2000x faster due to hardware AES instructions.

### Slide 14: GCM vs ECB Overhead

- At 10 MiB: GCM 693 MiB/s vs ECB 712 MiB/s — **~3% overhead**
- At 16 B: GCM 15 MiB/s vs ECB 30 MiB/s — **2x slower** (fixed setup cost)
- **Authentication is nearly free** when hardware-accelerated

### Slide 15: Key Setup Comparison

| Implementation | Mean | Median |
|---|---|---|
| Scratch | 12,925 ns | 12,875 ns |
| OpenSSL ECB | 634 ns | 334 ns |

**~20x faster** — hardware acceleration + optimized key schedule.

### Slide 16: Security Takeaways

1. **Use authenticated encryption** (GCM) for real applications
2. **Use vetted libraries** (OpenSSL) — don't implement crypto from scratch
3. **Hardware acceleration matters** — ~2000x performance difference
4. **ECB leaks patterns** — never use it for real data
5. **Nonce reuse breaks GCM** — always use fresh random nonces

---

## Demo Script

### Demo 1: Scratch AES Round Trace (2 minutes)

```bash
# Show the state after each transformation
./build/aes_scratch roundtrace \
  --key 000102030405060708090a0b0c0d0e0f \
  --input 00112233445566778899aabbccddeeff
```

**Narrator**: "This shows the state after each transformation in each round. You can see SubBytes providing confusion, ShiftRows and MixColumns providing diffusion, and AddRoundKey mixing in the key."

### Demo 2: GCM File Encryption (2 minutes)

```bash
# Generate a key
./build/aes_openssl keygen /tmp/demo_key.txt

# Encrypt a file
echo "Hello, AES-GCM!" > /tmp/demo_plain.txt
./build/aes_openssl encrypt /tmp/demo_key.txt /tmp/demo_plain.txt /tmp/demo_enc.bin

# Show the encrypted file
xxd /tmp/demo_enc.bin

# Decrypt
./build/aes_openssl decrypt /tmp/demo_key.txt /tmp/demo_enc.bin /tmp/demo_dec.txt
cat /tmp/demo_dec.txt
```

**Narrator**: "The encrypted file contains the nonce, authentication tag, and ciphertext. If any byte is modified, decryption fails."

### Demo 3: Tamper Detection (1 minute)

```bash
# Tamper with the encrypted file
cp /tmp/demo_enc.bin /tmp/demo_tampered.bin
printf '\x00' | dd of=/tmp/demo_tampered.bin bs=1 seek=13 count=1 conv=notrunc

# Attempt to decrypt
./build/aes_openssl decrypt /tmp/demo_key.txt /tmp/demo_tampered.bin /tmp/demo_dec2.txt
# Expected: "error: authentication failed — wrong key or tampered data."
```

**Narrator**: "Even a single byte change causes authentication failure. No plaintext is released."

### Demo 4: Performance Comparison (1 minute)

```bash
# Quick benchmark comparison
./build/aes_benchmark --impl scratch --op encrypt --size 1048576 --reps 3 --csv /tmp/bench.csv
./build/aes_benchmark --impl openssl-ecb --op encrypt --size 1048576 --reps 10 --csv /tmp/bench.csv
./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1048576 --reps 10 --csv /tmp/bench.csv
```

**Narrator**: "The scratch implementation takes ~3 seconds for 1 MiB, while OpenSSL takes ~1.4 milliseconds — about 2000x faster."

---

## Preparation Checklist

### Before the Presentation

- [ ] Build the project successfully (`cmake --build build -j`)
- [ ] Run all tests (`./build/aes_tests tests/test_vectors`)
- [ ] Verify demo commands work
- [ ] Prepare backup slides for Q&A
- [ ] Test projector/display resolution
- [ ] Have a backup copy of slides (USB, cloud)

### Technical Setup

- [ ] Laptop with macOS (or adapt commands for your platform)
- [ ] Projector or screen sharing
- [ ] Terminal with adequate font size (minimum 14pt)
- [ ] Backup terminal commands in a text file

### Demo Data

- [ ] Pre-generate demo key file
- [ ] Pre-create demo plaintext file
- [ ] Verify tamper demo produces expected error
- [ ] Clean up demo files after presentation

---

## Q&A Preparation

### Likely Questions

**Q: Why is the scratch implementation so slow?**
A: It performs byte-by-byte GF(2^8) multiplication without hardware acceleration or lookup tables. OpenSSL uses ARMv8 Cryptographic Extensions (hardware AES instructions) on the Apple M1.

**Q: Can I use the scratch implementation for real encryption?**
A: No. It provides no authentication, is not constant-time, and uses ECB mode. It is for educational purposes only.

**Q: What happens if I reuse a nonce in GCM?**
A: GCM security breaks completely — both confidentiality and integrity are compromised. Always use a fresh random nonce.

**Q: Is AES-128 still secure?**
A: Yes. The best known attack is brute force (2^128 operations), which is computationally infeasible. AES-128 is approved by NIST and widely used in production.

**Q: Why is GCM nearly as fast as ECB?**
A: On modern processors with hardware AES instructions, both the encryption and GHASH authentication are hardware-accelerated, making the overhead negligible.

**Q: What is the difference between ECB and GCM?**
A: ECB encrypts each block independently (insecure — leaks patterns). GCM uses counter mode encryption with GHASH authentication, providing both confidentiality and integrity.

**Q: How was the scratch implementation validated?**
A: Against FIPS 197 known-answer tests, NIST CAVP test vectors (273 ECB cases), and cross-validation against OpenSSL on 1,000 random blocks with 0 mismatches.

**Q: What about side-channel attacks?**
A: The scratch implementation is not constant-time (documented limitation). OpenSSL uses hardware AES instructions which are constant-time.

**Q: Can I extend this project?**
A: Yes! See `docs/contributing.md` for the contribution guide. Priority areas include CLI integration tests, fuzz testing, and CI/CD pipeline.

---

## Timing Tips

- **Practice at least twice** — once for content, once for timing
- **Keep demos short** — if a demo fails, move on and describe what should happen
- **Skip slides if needed** — slides 4-5 (AES fundamentals) can be condensed if the audience is familiar
- **Leave 2-3 minutes for Q&A** — don't let demos eat into Q&A time
- **Have a "backup" version** — a 5-minute version in case of technical difficulties

---

## Additional Resources

- `docs/architecture.md` — System architecture with diagrams
- `docs/testing-strategy.md` — Testing methodology
- `docs/benchmark-methodology.md` — Benchmark procedures
- `docs/security-model.md` — Security analysis
- `docs/faq.md` — Frequently asked questions
- `reports/final_report.md` — Complete technical report
