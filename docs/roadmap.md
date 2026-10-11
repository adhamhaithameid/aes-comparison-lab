# Project Roadmap

## Current Status

The AES Comparison Project has a solid foundation with two working AES implementations, a comprehensive test suite (1,431 checks), performance benchmarks (355 data points), and memory profiling (24 measurements). The core cryptographic implementations are correct and well-tested.

### Completed

- [x] Implementation A: From-scratch AES-128 block cipher (FIPS 197)
- [x] Implementation B: OpenSSL AES-128-GCM authenticated encryption wrapper
- [x] Comprehensive test suite (1,431 checks, 0 failures)
- [x] NIST CAVP known-answer tests (ECB + GCM)
- [x] FIPS 197 known-answer tests (Appendix B and C.1)
- [x] Round-trip tests (0 B to 10 MiB)
- [x] Negative/tampering tests (wrong key, modified ct/tag/nonce/AAD)
- [x] Cross-validation (1,000 random blocks, 0 mismatches)
- [x] Sanitizer testing (ASan + UBSan, 0 findings)
- [x] Performance benchmarks (3 implementations, 5 sizes, 3 operations)
- [x] Memory profiling (peak RSS, 24 measurements)
- [x] CLI tools (scratch demo + OpenSSL file encryption)
- [x] Automated workflow (`scripts/run_all.sh`)
- [x] Results aggregation (`scripts/run_all.py`)
- [x] Technical report (`reports/final_report.md`)
- [x] Performance analysis (`reports/performance_analysis.md`)
- [x] Documentation (12 files in `docs/`)

---

## Near-Term Priorities

### 1. Repository Hygiene

- [ ] Initialize git repository with granular commit history
- [ ] Add LICENSE file (OSI-approved)
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Add SECURITY.md
- [ ] Add CHANGELOG.md
- [ ] Add `.editorconfig`
- [ ] Add `.gitignore`

### 2. CI/CD Pipeline

- [ ] GitHub Actions: Build and test (Release)
- [ ] GitHub Actions: Sanitizer tests (ASan + UBSan)
- [ ] GitHub Actions: Benchmark validation
- [ ] GitHub Actions: Static analysis (clang-tidy)
- [ ] GitHub Actions: Secret scanning
- [ ] GitHub Actions: Dependency vulnerability checks (Dependabot)

### 3. Test Coverage Expansion

- [ ] CLI integration tests (automated)
- [ ] Fuzz testing (libFuzzer or AFL)
- [ ] Mutation testing (Mull or custom tooling)
- [ ] Concurrent/thread-safety tests
- [ ] Full NIST GCM test vectors (not just subset)

### 4. Code Quality

- [ ] Static analysis (clang-tidy)
- [ ] Code coverage measurement (llvm-cov)
- [ ] Benchmark validation script (`scripts/validate_results.py`)
- [ ] CSV schema validation

---

## Medium-Term Goals

### 5. Interactive Educational Platform

- [ ] Web application with AES visualizer
- [ ] Interactive round-by-round trace
- [ ] Key expansion explorer
- [ ] Side-by-side implementation comparison
- [ ] "What If?" security laboratory (interactive scenarios)

### 6. Extended Cryptographic Coverage

- [ ] AES-192 and AES-256 support
- [ ] Additional GCM nonce sizes (not just 96-bit)
- [ ] Additional GCM tag sizes (96, 104, 112, 120, 128 bits)
- [ ] CBC mode implementation
- [ ] CTR mode implementation

### 7. Platform Expansion

- [ ] Linux build and test (x86_64 with AES-NI)
- [ ] Linux build and test (ARM64)
- [ ] Windows build and test (MSVC)
- [ ] Cross-platform benchmark comparison

---

## Long-Term Vision

### 8. Security Laboratory

- [ ] Interactive "What If?" scenarios demonstrating:
  - [ ] ECB pattern leakage
  - [ ] GCM nonce reuse attack
  - [ ] Padding oracle attack (CBC)
  - [ ] Bit-flipping attack (unauthenticated modes)
  - [ ] Timing side-channel demonstration

### 9. Educational Content

- [ ] Video walkthrough of AES internals
- [ ] Interactive tutorials for each transformation
- [ ] Comparison of implementation approaches
- [ ] Security best practices guide

### 10. Production Hardening

- [ ] Constant-time implementation of scratch AES
- [ ] Memory wiping for sensitive data
- [ ] Streaming API for large files
- [ ] Key derivation function integration
- [ ] Hardware security module (HSM) support

---

## Feature Requests

Features are prioritized based on:

1. **Educational value** — Does it help people understand AES?
2. **Security relevance** — Does it demonstrate important security concepts?
3. **Implementation feasibility** — Can it be done correctly and safely?
4. **Community interest** — Is there demand from users?

To request a feature, open an issue with the `enhancement` label and describe:
- What the feature is
- Why it is valuable
- How it should work (if you have a specific design in mind)

---

## Release Planning

### v1.0 (Current)

- Two AES implementations (scratch + OpenSSL GCM)
- Comprehensive test suite
- Performance benchmarks
- CLI tools
- Documentation

### v1.1 (Near-term)

- Git repository with full history
- CI/CD pipeline
- Expanded test coverage
- Repository hygiene files

### v1.5 (Medium-term)

- Interactive educational platform
- Extended cryptographic coverage
- Platform expansion

### v2.0 (Long-term)

- Security laboratory
- Production hardening
- Educational content

---

## Contributing

See `docs/contributing.md` for how to contribute to the roadmap. Priority areas for contributions:

1. **Test coverage** — CLI integration tests, fuzz testing
2. **CI/CD** — GitHub Actions workflows
3. **Documentation** — Tutorials, educational content
4. **Platform support** — Linux, Windows builds
5. **Security** — Static analysis, secret scanning

---

## Metrics

| Metric | Current | Target (v1.1) | Target (v2.0) |
|---|---|---|---|
| Test checks | 1,431 | 2,000+ | 5,000+ |
| Test categories | 6 | 8+ | 12+ |
| Platforms | 1 (macOS) | 3 (macOS, Linux, Windows) | 5+ |
| CI workflows | 0 | 5+ | 10+ |
| Documentation files | 12 | 15+ | 25+ |
| Benchmark data points | 355 | 500+ | 1,000+ |
