# AES Implementation Comparison

A Software Security project comparing two C++ implementations of the Advanced
Encryption Standard (AES):

- **Implementation A** — AES-128 block cipher written from scratch, exposing
  every transformation (SubBytes, ShiftRows, MixColumns, AddRoundKey, key
  expansion) for educational and validation purposes.
- **Implementation B** — AES-128-GCM authenticated encryption via the OpenSSL
  EVP interface, suitable for real file encryption.

## Project Structure

```
.
├── CMakeLists.txt              # Build configuration (C++17)
├── src/
│   ├── aes_core.hpp            # Implementation A: from-scratch AES-128
│   ├── aes_core.cpp
│   ├── aes_gcm_openssl.hpp     # Implementation B: OpenSSL AES-128-GCM wrapper
│   ├── aes_gcm_openssl.cpp
│   ├── aes_scratch_main.cpp    # CLI for Implementation A (block cipher demo)
│   ├── aes_openssl_main.cpp    # CLI for Implementation B (file encryption)
│   ├── benchmark.cpp           # Performance benchmark tool
│   └── test_main.cpp           # Automated test suite
├── tests/
│   ├── test_vectors/           # NIST CAVP test vectors + FIPS 197 KATs
│   └── test_plan.md            # Detailed testing plan
├── scripts/
│   ├── run_all.sh              # Complete automation script
│   └── run_all.py              # Result processing and figure generation
├── results/                    # Benchmark and test results (generated)
└── reports/                    # Final report and figures (generated)
```

## Prerequisites

- C++17 compiler (clang++ or g++)
- CMake 3.16+
- OpenSSL development files
- Python 3 (for result processing; no external packages required)

### macOS

```bash
brew install cmake openssl
```

## Building

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

## Running

### Tests

```bash
./build/aes_tests tests/test_vectors
```

This runs 1400+ checks including:
- FIPS 197 known-answer tests
- NIST CAVP ECB KATs (GFSbox, VarTxt, VarKey, MMT)
- NIST CAVP GCM KATs (encrypt + decrypt incl. official FAIL cases)
- Round-trip tests (0 B to 10 MB)
- Negative/tampering tests
- Cross-validation (scratch vs OpenSSL on 1000 random blocks)

### Sanitizer Build

```bash
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
./build-san/aes_tests tests/test_vectors
```

### CLI Tools

```bash
# Implementation A: block cipher demonstration
./build/aes_scratch kat
./build/aes_scratch encrypt-block --key 000102030405060708090a0b0c0d0e0f \
    --input 00112233445566778899aabbccddeeff

# Implementation B: file encryption
./build/aes_openssl keygen mykey.txt
./build/aes_openssl encrypt mykey.txt secret.txt secret.enc
./build/aes_openssl decrypt mykey.txt secret.enc secret_dec.txt
```

### Benchmarks

```bash
./build/aes_benchmark --impl scratch --op encrypt --size 1048576 \
    --reps 10 --csv results/benchmark_results.csv
```

### Complete Workflow

```bash
scripts/run_all.sh
```

This runs all stages: build, test, sanitize, benchmark, memory measurement,
and report generation.

## Security Notes

**Implementation A** is a raw block cipher. It provides:
- NO authentication (ciphertext can be tampered with undetected)
- NO protection against replay attacks
- NO padding (input must be a multiple of 16 bytes)

It is intended for **education and validation only**. Do not use it to
encrypt real data.

**Implementation B** uses AES-128-GCM via OpenSSL, which provides:
- Confidentiality and integrity
- Fresh random nonce per encryption
- 128-bit authentication tag verified before plaintext release

Use Implementation B (or a vetted library like OpenSSL, libsodium, or
mbedTLS) for real applications.

## License

This project is provided for educational purposes as part of a Software
Security course assignment.
