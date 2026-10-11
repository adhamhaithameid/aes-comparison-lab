# Frequently Asked Questions

## General Questions

### Q: What is this project?

A: This project implements and compares two C++ implementations of AES-128 encryption: a from-scratch block cipher (Implementation A) and an OpenSSL-based AES-128-GCM authenticated encryption wrapper (Implementation B). It includes a comprehensive test suite, performance benchmarks, and memory profiling.

### Q: What is AES?

A: AES (Advanced Encryption Standard) is a symmetric block cipher specified in FIPS 197 (NIST, 2001, updated 2023). It operates on 128-bit blocks with 128, 192, or 256-bit keys. AES-128 uses 10 rounds of transformation.

### Q: What is the difference between Implementation A and Implementation B?

A: Implementation A is a from-scratch AES-128 block cipher for educational purposes — it exposes every transformation (SubBytes, ShiftRows, MixColumns, AddRoundKey) and is validated against NIST test vectors. Implementation B wraps OpenSSL's EVP interface to provide AES-128-GCM authenticated encryption with a fresh random nonce and 128-bit authentication tag.

### Q: Which implementation should I use for real encryption?

A: **Implementation B (OpenSSL AES-128-GCM)**. The scratch implementation is for education and validation only — it provides no authentication, is not constant-time, and is approximately 2000x slower.

---

## AES Algorithm Questions

### Q: What is a block cipher?

A: A block cipher is a deterministic algorithm that operates on fixed-length groups of bits (blocks). AES operates on 128-bit blocks. A raw block cipher provides only confidentiality — it does not detect tampering.

### Q: What is a mode of operation?

A: A mode of operation defines how to apply a block cipher to data larger than one block. Common modes include ECB (Electronic Codebook), CBC (Cipher Block Chaining), CTR (Counter), and GCM (Galois/Counter Mode). GCM provides both confidentiality and authentication.

### Q: What is GCM?

A: GCM (Galois/Counter Mode) is an authenticated encryption mode specified in NIST SP 800-38D. It combines CTR mode encryption with GHASH authentication, providing both confidentiality and integrity. It requires a unique nonce for each encryption with the same key.

### Q: What is a nonce?

A: A nonce (number used once) is a random value used in encryption to ensure that encrypting the same plaintext twice produces different ciphertexts. GCM uses a 96-bit nonce. **Never reuse a nonce with the same key** — doing so breaks GCM security.

### Q: What is an authentication tag?

A: An authentication tag is a cryptographic checksum computed over the ciphertext and additional authenticated data. In GCM, it is 128 bits. The tag is verified during decryption — if it does not match, the ciphertext has been modified and no plaintext is released.

### Q: What is AAD?

A: AAD (Additional Authenticated Data) is data that is authenticated but not encrypted. It is included in the GHASH computation but passed through as plaintext. Examples include packet headers or metadata.

### Q: What is ECB mode and why is it insecure?

A: ECB (Electronic Codebook) mode encrypts each block independently. Identical plaintext blocks produce identical ciphertext blocks, revealing patterns in the data. For example, an image encrypted with ECB still shows its outline. ECB should never be used for real encryption.

### Q: What is key expansion?

A: Key expansion is the process of deriving round keys from the original key. AES-128 expands a 128-bit key into 11 round keys (176 bytes) using RotWord, SubWord, and Rcon operations.

---

## Implementation Questions

### Q: Why is the scratch implementation so slow?

A: The scratch implementation performs byte-by-byte GF(2^8) multiplication without hardware acceleration or precomputed lookup tables. OpenSSL uses ARMv8 Cryptographic Extensions (hardware AES instructions) on the Apple M1, providing approximately 2000x higher throughput.

### Q: Is the scratch implementation secure?

A: **No.** The scratch implementation is for educational purposes only. It provides no authentication, is not constant-time, and uses ECB mode for multi-block data. It must NOT be used to encrypt real data.

### Q: How does the OpenSSL wrapper manage resources?

A: The OpenSSL wrapper uses RAII (Resource Acquisition Is Initialization) with `std::unique_ptr` and a custom deleter for EVP contexts. This ensures exception-safe resource management — contexts are automatically freed when they go out of scope.

### Q: What happens when GCM authentication fails?

A: When GCM authentication fails (wrong key, modified ciphertext, tag, nonce, or AAD), the `decrypt()` function returns `std::nullopt` and **no plaintext is released** to the caller. This prevents any information leakage through partial plaintext.

### Q: What file format does the OpenSSL CLI use?

A: The encrypted file format is: `nonce(12 bytes) || tag(16 bytes) || ciphertext(n bytes)`. The nonce is prepended and the tag is inserted between the nonce and ciphertext, making the file self-contained for decryption.

---

## Testing Questions

### Q: How many tests are there?

A: The test suite contains 1,431 checks across 6 categories: known-answer tests (288), round-trip tests (20), boundary tests (14), negative/tampering tests (51), cross-validation (1,000), and determinism checks (5).

### Q: What test vectors are used?

A: The project uses NIST CAVP (Cryptographic Algorithm Validation Program) test vectors: ECBGFSbox128, ECBVarTxt128, ECBVarKey128, ECBMMT128, and GCM encrypt/decrypt subsets. It also uses FIPS 197 Appendix B and C.1 known-answer tests.

### Q: What is cross-validation?

A: Cross-validation compares the scratch implementation against OpenSSL on 1,000 random blocks. Both implementations must produce identical ciphertext for the same key and plaintext. This verifies that the from-scratch implementation is correct.

### Q: Are sanitizer tests run?

A: Yes. The test suite is run under AddressSanitizer (ASan) and UndefinedBehaviorSanitizer (UBSan) to detect memory errors and undefined behavior. All 1,431 checks pass under sanitizers.

### Q: How are tests reproduced?

A: Tests use a fixed random seed (`0xAE5128`) for reproducibility. Run `./build/aes_tests tests/test_vectors` to execute the full suite.

---

## Benchmark Questions

### Q: How were benchmarks conducted?

A: Benchmarks were conducted on an Apple M1 (arm64) running macOS 27.0.1, using Apple clang 21.0.0 with `-O3` optimization. Each measurement was timed with `std::chrono::steady_clock` (monotonic, nanosecond resolution). Warmup iterations were performed before timing.

### Q: What were the key benchmark findings?

A: OpenSSL achieves approximately 2000x higher throughput than the scratch implementation at large sizes (712 MiB/s vs 0.34 MiB/s at 10 MiB). GCM mode incurs only approximately 3% overhead over raw ECB at large sizes. Key setup is approximately 20x slower in the scratch implementation.

### Q: Why is GCM nearly as fast as ECB?

A: On the Apple M1, both ECB and GCM benefit from ARMv8 Cryptographic Extensions (hardware AES instructions). The GHASH authentication in GCM is also hardware-accelerated, making the overhead negligible at large sizes.

### Q: How was memory usage measured?

A: Memory usage was measured with `/usr/bin/time -l` (peak RSS on macOS). Each measurement was taken in a fresh process. Baseline RSS was recorded with minimal workload.

---

## Building and Running Questions

### Q: How do I build the project?

A:
```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

### Q: How do I run the tests?

A:
```bash
./build/aes_tests tests/test_vectors
```

### Q: How do I run sanitizer tests?

A:
```bash
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors
```

### Q: How do I run benchmarks?

A:
```bash
./build/aes_benchmark --impl scratch --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-ecb --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1048576 --reps 10 --csv results/benchmark_results.csv
```

### Q: How do I run the complete workflow?

A:
```bash
scripts/run_all.sh
```

This runs: build, test, sanitizer test, benchmark, memory profiling, aggregation, and report generation.

### Q: How do I use the OpenSSL CLI for file encryption?

A:
```bash
# Generate a key
./build/aes_openssl keygen mykey.txt

# Encrypt a file
./build/aes_openssl encrypt mykey.txt plaintext.txt encrypted.bin

# Decrypt a file
./build/aes_openssl decrypt mykey.txt encrypted.bin decrypted.txt
```

### Q: How do I use the scratch CLI?

A:
```bash
# Run KATs
./build/aes_scratch kat

# Encrypt a single block
./build/aes_scratch encrypt-block --key 000102030405060708090a0b0c0d0e0f --input 00112233445566778899aabbccddeeff

# Decrypt a single block
./build/aes_scratch decrypt-block --key 000102030405060708090a0b0c0d0e0f --input 69c4e0d86a7b0430d8cdb78070b4c55a

# Print round keys
./build/aes_scratch expand-key --key 000102030405060708090a0b0c0d0e0f

# Trace round transformations
./build/aes_scratch roundtrace --key 000102030405060708090a0b0c0d0e0f --input 00112233445566778899aabbccddeeff
```

---

## Security Questions

### Q: Can I use the scratch implementation for real encryption?

A: **No.** The scratch implementation provides no authentication, is not constant-time, and uses ECB mode. It is for educational and validation purposes only.

### Q: What happens if I lose my key?

A: There is no key recovery mechanism. If you lose the key, the encrypted data is permanently unrecoverable. This is a fundamental property of symmetric encryption.

### Q: What happens if an attacker modifies an encrypted file?

A: With Implementation B (GCM), any modification to the ciphertext, tag, or nonce causes authentication failure. The decryptor returns `nullopt` and no plaintext is released. With Implementation A (ECB), modifications are undetected.

### Q: How should I store my keys?

A: Keys should be stored securely — preferably in a hardware security module (HSM), key management service (KMS), or at minimum a file with restrictive permissions (`0600`). The `keygen` subcommand sets permissions correctly.

### Q: Is AES-128 still secure?

A: Yes. AES-128 is considered secure against classical computing attacks. The best known attack on AES-128 is brute force (2^128 operations), which is computationally infeasible. AES-128 is approved for use by NIST and is widely used in production systems.
