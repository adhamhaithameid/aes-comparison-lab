# Glossary

## Cryptographic Terms

### Advanced Encryption Standard (AES)
A symmetric block cipher specified in FIPS 197 (NIST, 2001, updated 2023). It operates on 128-bit blocks with 128, 192, or 256-bit keys. AES-128 uses 10 rounds, AES-192 uses 12 rounds, and AES-256 uses 14 rounds. It is the most widely used symmetric encryption algorithm in the world.

### Block Cipher
A deterministic algorithm that operates on fixed-length groups of bits (blocks). AES operates on 128-bit blocks. A raw block cipher provides only confidentiality — it does not detect tampering. To encrypt data larger than one block, a mode of operation must be used.

### Block Size
The fixed length of data that a block cipher operates on. AES has a block size of 128 bits (16 bytes).

### Mode of Operation
A method for applying a block cipher to data larger than one block. Common modes include:
- **ECB** (Electronic Codebook) — each block encrypted independently; insecure
- **CBC** (Cipher Block Chaining) — each block XORed with previous ciphertext
- **CTR** (Counter) — counter mode; converts block cipher to stream cipher
- **GCM** (Galois/Counter Mode) — CTR mode + GHASH authentication

### Galois/Counter Mode (GCM)
An authenticated encryption mode specified in NIST SP 800-38D. It combines CTR mode encryption with GHASH authentication, providing both confidentiality and integrity. It requires a unique nonce for each encryption with the same key.

### Nonce (IV)
A number used once — a random value used in encryption to ensure that encrypting the same plaintext twice produces different ciphertexts. GCM uses a 96-bit (12-byte) nonce. **Never reuse a nonce with the same key** — doing so breaks GCM security.

### Authentication Tag
A cryptographic checksum computed over the ciphertext and additional authenticated data. In GCM, it is 128 bits (16 bytes). The tag is verified during decryption — if it does not match, the ciphertext has been modified and no plaintext is released.

### Additional Authenticated Data (AAD)
Data that is authenticated but not encrypted. It is included in the GHASH computation but passed through as plaintext. Examples include packet headers or metadata.

### Known-Answer Test (KAT)
A test that verifies an implementation produces the correct output for a predefined input. KATs use published test vectors from standards bodies (NIST) to validate correctness.

### CAVP (Cryptographic Algorithm Validation Program)
NIST's program for validating cryptographic algorithms. CAVP provides test vectors in `.rsp` files for AES, GCM, and other algorithms.

### FIPS 197
The Federal Information Processing Standard that specifies AES. Published by NIST in 2001, updated in 2023. Defines the algorithm, key expansion, and encryption/decryption procedures.

### SP 800-38D
NIST Special Publication that specifies GCM and GMAC. Defines the authenticated encryption mode used in Implementation B.

### SP 800-38A
NIST Special Publication that specifies ECB, CBC, CFB, OFB, and CTR modes. Provides test vectors used in this project.

### Key Expansion
The process of deriving round keys from the original key. AES-128 expands a 128-bit key into 11 round keys (176 bytes) using RotWord, SubWord, and Rcon operations.

### Round Key
A 16-byte subkey derived from the original key during key expansion. AES-128 uses 11 round keys (round keys 0 through 10).

### SubBytes
A non-linear byte substitution using the S-box. Each byte of the state is replaced by its S-box value. Provides confusion.

### ShiftRows
A transposition step where each row of the state is cyclically shifted left by its row index. Row 0 is not shifted, row 1 by 1, row 2 by 2, row 3 by 3. Provides diffusion.

### MixColumns
A linear mixing operation where each column of the state is multiplied by a fixed 4x4 matrix over GF(2^8). Provides diffusion. Omitted in the final round.

### AddRoundKey
The XOR of the state with a round-specific subkey. This is the only transformation that involves key material.

### S-Box
The substitution box used in SubBytes. A 256-byte lookup table computed from the multiplicative inverse in GF(2^8) followed by an affine transformation. In this project, the S-box is computed programmatically at startup.

### GF(2^8)
The Galois Field with 256 elements, used in AES for MixColumns and S-box computation. Arithmetic is performed modulo the irreducible polynomial x^8 + x^4 + x^3 + x + 1.

### Rcon (Round Constant)
A constant used in key expansion. Rcon[i] = x^(i-1) in GF(2^8), where x = 0x02.

### RotWord
A cyclic left rotation of a 4-byte word. Used in key expansion.

### SubWord
Application of the S-box to each byte of a 4-byte word. Used in key expansion.

### EVP (Envelope)
OpenSSL's high-level cryptographic API. Provides a consistent interface for encryption, decryption, and key management across different algorithms.

### RAII (Resource Acquisition Is Initialization)
A C++ programming idiom where resource management is tied to object lifetime. Resources are acquired in constructors and released in destructors. Used in this project for OpenSSL EVP context management.

### CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
A random number generator suitable for cryptographic use. OpenSSL's `RAND_bytes` is a CSPRNG.

---

## Testing Terms

### Unit Test
A test that verifies the correctness of a single function or component in isolation. In this project, unit tests include KATs, transformation tests, and key expansion tests.

### Integration Test
A test that verifies the interaction between components. In this project, round-trip tests and cross-validation tests are integration tests.

### End-to-End Test (E2E)
A test that verifies the complete system from user input to output. In this project, CLI integration tests would be E2E tests (currently a gap).

### Regression Test
A test that verifies that previously fixed bugs do not reoccur. Determinism checks and cross-validation tests serve as regression tests.

### Sanitizer
A runtime tool that detects memory errors and undefined behavior. This project uses AddressSanitizer (ASan) and UndefinedBehaviorSanitizer (UBSan).

### ASan (AddressSanitizer)
A memory error detector that finds heap buffer overflows, stack buffer overflows, use-after-free, and memory leaks.

### UBSan (UndefinedBehaviorSanitizer)
A detector for undefined behavior such as signed integer overflow, misaligned access, and null pointer dereference.

### Cross-Validation
Comparing the output of two independent implementations on identical inputs. In this project, the scratch implementation is compared against OpenSSL on 1,000 random blocks.

### Boundary Test
A test that verifies behavior at the edges of valid input ranges. In this project, boundary tests cover sizes from 0 bytes to 10 MiB.

### Negative Test
A test that verifies correct handling of invalid input. In this project, negative tests verify that tampered ciphertext, wrong keys, and malformed input are properly rejected.

### Fuzz Testing
A testing technique that provides random or malformed input to find crashes and security vulnerabilities. Not currently implemented in this project (identified gap).

### Mutation Testing
A testing technique that introduces small code changes (mutations) to verify that the test suite detects them. Not currently implemented in this project (identified gap).

---

## Performance Terms

### Throughput
The amount of data processed per unit time. In this project, measured in MiB/s (megabytes per second).

### Latency
The time taken to complete a single operation. In this project, measured in nanoseconds (ns) or milliseconds (ms).

### Warmup
Preliminary iterations performed before timing to stabilize CPU caches, branch predictors, and memory allocators.

### Dead-Code Elimination
A compiler optimization that removes code whose results are never used. Prevented in this project by computing a checksum of the output and writing it to a volatile sink.

### Peak RSS (Resident Set Size)
The maximum amount of physical memory used by a process during its lifetime. Measured with `/usr/bin/time -l` on macOS.

### Hardware Acceleration
The use of specialized CPU instructions to speed up cryptographic operations. On the Apple M1, ARMv8 Cryptographic Extensions provide hardware AES instructions.

### AES-NI (Advanced Encryption Standard New Instructions)
Intel's hardware acceleration for AES. Available on x86 processors. The Apple M1 uses ARMv8 Cryptographic Extensions instead.

### ARMv8 Cryptographic Extensions
ARM's hardware acceleration for AES and other cryptographic operations. Available on the Apple M1 (`hw.optional.arm.FEAT_AES: 1`).

---

## Project-Specific Terms

### Implementation A
The from-scratch AES-128 block cipher in `src/aes_core.hpp` and `src/aes_core.cpp`. Designed for education and validation. Provides no authentication.

### Implementation B
The OpenSSL AES-128-GCM wrapper in `src/aes_gcm_openssl.hpp` and `src/aes_gcm_openssl.cpp`. Designed for production use. Provides authenticated encryption.

### Scratch CLI
The command-line tool `aes_scratch_main` for demonstrating the scratch implementation. Subcommands: `kat`, `encrypt-block`, `decrypt-block`, `expand-key`, `roundtrace`.

### OpenSSL CLI
The command-line tool `aes_openssl_main` for file encryption with GCM. Subcommands: `keygen`, `encrypt`, `decrypt`, `selftest`.

### Test Vector
A predefined input/output pair used to verify correctness. NIST CAVP provides test vectors in `.rsp` files.

### .rsp File
A response file format used by NIST CAVP to distribute test vectors. Contains key/value fields for each test case.

### McGrew-Viega Test Case 3
A published GCM test vector from the GCM specification (McGrew and Viega, 2004). Used in the OpenSSL CLI selftest.
