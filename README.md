# AES Implementation Comparison

A Software Security project comparing two C++ implementations of the Advanced
Encryption Standard (AES):

- **Implementation A** — AES-128 block cipher written from scratch, exposing
  every transformation (SubBytes, ShiftRows, MixColumns, AddRoundKey, key
  expansion) for educational and validation purposes.
- **Implementation B** — AES-128-GCM authenticated encryption via the OpenSSL
  EVP interface, suitable for real file encryption.

## Quick Start

```bash
# Build
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j

# Run all tests (1,431 checks)
./build/aes_tests tests/test_vectors

# Run benchmarks
./scripts/run_benchmarks.sh

# Run complete workflow
./scripts/run_all.sh
```

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
├── web/                        # Interactive educational platform
│   ├── public/                 # Static web app (HTML/CSS/JS)
│   └── tests/                  # Playwright E2E tests
├── scripts/                    # Automation scripts
│   ├── run_all.sh              # Complete workflow
│   ├── run_tests.sh            # Test-only runner
│   ├── run_regression.sh       # Regression suite
│   ├── run_sanitizers.sh       # Sanitizer build + test
│   ├── run_benchmarks.sh       # Benchmark-only runner
│   ├── run_memory_tests.sh     # Memory measurement runner
│   ├── build_web.sh            # Web platform builder
│   ├── run_e2e.sh              # Browser E2E tests
│   └── validate_results.py     # Benchmark data validator
├── docs/                       # Comprehensive documentation
├── results/                    # Benchmark and test results
├── reports/                    # Final report and figures
└── presentation/               # Presentation materials
```

## Interactive Web Platform

The project includes a full interactive educational website:

- **Landing Page** — Project overview and navigation
- **AES Fundamentals** — Beginner-to-advanced explanations
- **AES Round Visualizer** — Step through all 10 rounds with real state display
- **Key Expansion Explorer** — Visualize RotWord, SubWord, Rcon, XOR
- **Comparison Dashboard** — Performance charts and implementation comparison
- **What If? Security Lab** — 12 interactive security scenarios

### Running the Web Platform

```bash
# From the web directory
cd web
npm install
npm run dev

# Or serve statically
cd web/public
python3 -m http.server 8080
# Open http://localhost:8080
```

## Prerequisites

- C++17 compiler (clang++ or g++)
- CMake 3.16+
- OpenSSL development files
- Python 3 (for result processing)
- Node.js 18+ (for web platform and E2E tests)

### macOS

```bash
brew install cmake openssl node
```

### Ubuntu/Debian

```bash
sudo apt-get install cmake g++ libssl-dev python3 nodejs npm
```

## Running

### Tests

```bash
./build/aes_tests tests/test_vectors
```

This runs 1,431 checks including:
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
./build/aes_benchmark --impl openssl-ecb --op encrypt --size 1048576 \
    --reps 10 --csv results/benchmark_results.csv
./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1048576 \
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
Security course assignment. See [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
