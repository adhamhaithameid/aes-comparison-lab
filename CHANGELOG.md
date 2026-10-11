# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-11

### Added

- AES-128 from-scratch implementation (FIPS 197 compliant)
- OpenSSL AES-128-GCM authenticated encryption wrapper
- Comprehensive test suite (1,431 checks)
  - FIPS 197 known-answer tests
  - NIST CAVP ECB KATs (GFSbox, VarTxt, VarKey, MMT)
  - NIST CAVP GCM KATs (encrypt + decrypt incl. FAIL cases)
  - Round-trip tests (0 B to 10 MB)
  - Negative/tampering tests
  - Cross-validation (scratch vs OpenSSL on 1000 random blocks)
- Benchmark infrastructure (5 input sizes, 3 implementations, 3 operations)
- Memory measurement infrastructure (peak RSS)
- SVG figure generation from real benchmark data
- Interactive web platform
  - Landing page
  - AES fundamentals module
  - Interactive AES round visualizer
  - Key expansion explorer
  - Implementation comparison dashboard
  - "What If? — AES Security Lab" (12 scenarios)
- GitHub Actions CI workflows
- Complete documentation (architecture, testing, benchmarks, security, etc.)
- Presentation pack (slide outline, demo script, checklist, Q&A)

### Security

- From-scratch implementation is educational only (no authentication)
- OpenSSL GCM wrapper verifies tag before releasing plaintext
- All "What If?" scenarios use synthetic data only
- No secrets committed to repository

### Known Limitations

- AES-192/256 not implemented
- From-scratch implementation not constant-time (side-channel vulnerable)
- Single-platform benchmarks (Apple M1)
- Memory measurements include process overhead
