# Contributing to AES Comparison Lab

Thank you for your interest in contributing! This project is an educational
resource for understanding AES implementations, testing, and security.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aes-comparison-lab.git`
3. Create a branch: `git checkout -b feat/my-improvement`
4. Build: `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j`
5. Run tests: `./build/aes_tests tests/test_vectors`

## Development Setup

```bash
# macOS
brew install cmake openssl

# Ubuntu/Debian
sudo apt-get install cmake g++ libssl-dev python3

# Windows (vcpkg)
vcpkg install openssl
```

## Coding Standards

### C++

- C++17 or later
- Use `std::array`, `std::vector`, `std::optional` — no raw pointers where possible
- All AES state operations use the FIPS 197 column-major layout
- No cryptography library calls in the from-scratch implementation
- OpenSSL wrapper uses RAII (`std::unique_ptr` with custom deleters)
- Comments explain the *why*, not just the *what*

### JavaScript (Web)

- ES6+ modules
- No frameworks for the educational implementation
- All cryptographic code clearly labeled "Educational — NOT for production"
- Semantic HTML5, ARIA labels, keyboard navigation
- CSS custom properties for theming

### Python

- Python 3.8+
- Standard library only (no external dependencies for core scripts)
- Type hints where practical

## Testing Requirements

Before submitting:

```bash
# Run all tests
./scripts/run_regression.sh

# Run sanitizers
./scripts/run_sanitizers.sh

# Run benchmarks (optional — only if benchmark code changed)
./scripts/run_benchmarks.sh
```

All tests must pass. New features must include tests.

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(aes): implement AES-128 key expansion
test(aes): add NIST known-answer vectors
feat(bench): add repeated timing measurements
docs(testing): document integration and regression plan
feat(web): add AES round visualizer
feat(lab): demonstrate GCM authentication failures
ci: add C++ and browser test workflows
```

## Pull Request Process

1. Update documentation for any changed behavior
2. Add tests for new features
3. Ensure `scripts/run_regression.sh` passes
4. Fill out the PR template
5. Request review from a maintainer

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md). Never commit real keys, secrets, or
sensitive data.
