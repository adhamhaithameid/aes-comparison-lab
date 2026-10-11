# Presentation Slide Outline (10–15 minutes)

## Slide 1: Title
**AES Implementation Comparison: From Scratch vs. OpenSSL**
- Software Security Project
- Date, presenter name

## Slide 2: Motivation
- AES is the world's most widely used symmetric cipher
- Two implementations: educational (from scratch) vs. production (OpenSSL)
- Key question: What can we learn by comparing them?

## Slide 3: What is AES?
- Symmetric block cipher (same key for encrypt/decrypt)
- 128-bit blocks, 128/192/256-bit keys
- 10/12/14 rounds respectively
- FIPS 197 standard (NIST, 2001)

## Slide 4: AES State and Transformations
- 4×4 byte matrix (column-major)
- SubBytes (S-box substitution)
- ShiftRows (row rotation)
- MixColumns (GF(2⁸) mixing)
- AddRoundKey (XOR with round key)

## Slide 5: AES Rounds
- Initial: AddRoundKey
- Rounds 1–9: SubBytes → ShiftRows → MixColumns → AddRoundKey
- Round 10: SubBytes → ShiftRows → AddRoundKey (no MixColumns)

## Slide 6: Key Expansion
- 128-bit key → 11 round keys (176 bytes)
- RotWord, SubWord, Rcon operations
- Demonstrated interactively

## Slide 7: Implementation A — From Scratch
- Pure C++17, no crypto libraries
- S-box computed from GF(2⁸) arithmetic
- All transformations exposed for testing
- Educational purpose only

## Slide 8: Implementation B — OpenSSL GCM
- EVP API, AES-128-GCM
- Fresh random nonce per encryption
- 128-bit authentication tag
- Production-ready authenticated encryption

## Slide 9: Test Results
- 1,431 automated checks, 0 failures
- FIPS 197 KATs: 2/2 pass
- NIST CAVP ECB: 273/273 pass
- NIST CAVP GCM: 36/36 pass (incl. 13 official FAIL cases)
- Cross-validation: 1,000/1,000 blocks match

## Slide 10: Performance Results
- Scratch: ~0.3 MiB/s (no hardware acceleration)
- OpenSSL ECB: ~712 MiB/s (hardware-accelerated)
- OpenSSL GCM: ~693 MiB/s (authenticated)
- ~2,100x speedup from hardware acceleration

## Slide 11: Memory Usage
- Baseline: 1.9 MB (scratch) vs 3.9 MB (OpenSSL)
- At 10 MiB: ~23–25 MB for all implementations
- Linear scaling with input size

## Slide 12: What If? Security Lab
- Interactive scenarios demonstrating:
  - GCM authentication failures
  - Nonce reuse dangers
  - ECB pattern leakage
  - Why round-trip ≠ correctness

## Slide 13: Key Takeaways
- Use authenticated encryption (GCM) for real applications
- Use vetted libraries (OpenSSL) — don't roll your own crypto
- Known-answer tests are essential (round-trip is not sufficient)
- Hardware acceleration matters enormously

## Slide 14: Live Demo (3–4 minutes)
- Show the interactive AES visualizer
- Run a "What If?" scenario
- Show the benchmark dashboard

## Slide 15: Q&A
- Open for questions
