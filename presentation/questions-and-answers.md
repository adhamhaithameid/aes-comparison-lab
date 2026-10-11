# Questions and Answers

## General

**Q: Why compare two implementations of AES?**
A: To understand the algorithm deeply (from scratch) and to see what a
production library provides (OpenSSL). The comparison reveals the value of
hardware acceleration, the importance of authenticated encryption, and the
gap between educational and production code.

**Q: What makes AES symmetric?**
A: The same key is used for both encryption and decryption. This is in
contrast to asymmetric (public-key) cryptography, which uses different keys
for encryption and decryption.

**Q: Why does AES use multiple rounds?**
A: A single round of substitution and permutation is easily broken. Multiple
 rounds (10 for AES-128) provide both confusion (S-box) and diffusion
(ShiftRows/MixColumns), making the cipher resistant to cryptanalysis.

**Q: What is the difference between a block cipher and an encryption mode?**
A: A block cipher (like raw AES) encrypts fixed-size blocks. A mode (like
GCM, CBC, CTR) defines how to handle arbitrary-length data and additional
properties like authentication. You should always use a mode, never raw AES.

## Testing

**Q: Why are known-answer tests important?**
A: Known-answer tests compare output against published expected values from
NIST. Round-trip tests only verify that your implementation is self-consistent —
a wrong implementation can still pass round-trips.

**Q: Why can round-trip tests be misleading?**
A: If you implement AES incorrectly (e.g., wrong S-box), encryption and
decryption will still be inverses of each other. The round-trip will succeed,
but the output won't match the AES standard. Known-answer tests catch this.

**Q: What is mutation testing?**
A: Deliberately introducing bugs into the implementation and verifying that
the test suite detects them. This tests the tests, not just the code.

## Performance

**Q: Why can OpenSSL be faster?**
A: OpenSSL uses hardware AES instructions (AES-NI on x86, Cryptographic
Extensions on ARM). Our from-scratch implementation uses portable C++ with
byte-by-byte GF(2⁸) multiplication — correct but not optimized.

**Q: How does hardware acceleration affect performance?**
A: On Apple M1, OpenSSL achieves ~712 MiB/s vs ~0.3 MiB/s for our
implementation — a ~2,100x speedup. Hardware AES instructions perform the
entire round in a single CPU instruction.

**Q: Why do execution time and throughput tell different stories?**
A: Execution time is absolute (how long for this input). Throughput is
normalized (how much data per second). A small input has high overhead but
low throughput; a large input amortizes overhead and achieves higher
throughput.

**Q: Why is memory measurement difficult?**
A: Peak RSS includes the entire process — code, libraries, runtime, stacks,
and heap. You cannot isolate "AES memory" from "process memory." Additionally,
OS memory management (paging, compression) affects measurements.

## Security

**Q: Why is AES-GCM preferable to unauthenticated encryption?**
A: GCM provides both confidentiality (encryption) and integrity (authentication).
Without authentication, an attacker can modify ciphertext and you won't know.
GCM's tag verification detects any modification.

**Q: What happens when an authentication tag fails?**
A: The decryption function returns no plaintext. In our implementation, it
returns `std::nullopt` — the unauthenticated data is never released to the
caller. This prevents padding oracle and similar attacks.

**Q: Why is nonce reuse dangerous?**
A: In GCM, reusing a nonce with the same key allows an attacker to recover
the XOR of two plaintexts and forge authentication tags. This completely
breaks both confidentiality and integrity. Our normal encryption always
generates a fresh random nonce.

**Q: Why is a custom AES implementation not automatically production-ready?**
A: Correctness is necessary but not sufficient. Production code must also
be constant-time (side-channel resistant), handle errors safely, manage
memory correctly, and withstand rigorous security review. Our from-scratch
implementation is educational only.

## Implementation

**Q: What AES key sizes are supported?**
A: This project implements AES-128 only (the minimum required). AES-192 and
AES-256 use the same structure with 12 and 14 rounds respectively.

**Q: What is the S-box?**
A: The S-box is a 256-byte lookup table that provides non-linear substitution.
It's computed from the multiplicative inverse in GF(2⁸) followed by an
affine transformation. We compute it programmatically rather than hardcoding
it.

**Q: What is GF(2⁸)?**
A: The Galois Field with 256 elements — the finite field used by AES for
MixColumns. Arithmetic is modulo the irreducible polynomial
x⁸ + x⁴ + x³ + x + 1. Addition is XOR; multiplication is more complex
(xtime-based).
