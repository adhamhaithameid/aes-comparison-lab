# Contributing Guide

Thank you for your interest in contributing to the AES Comparison Project. This guide describes how to set up the development environment, coding standards, testing requirements, and commit conventions.

---

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| C++ Compiler | Apple clang 21.0.0 or later | Compilation |
| CMake | 3.31.3 or later | Build system |
| OpenSSL | 4.0.3 or later | Implementation B dependency |
| Python | 3.12.2 or later | Scripts and aggregation |

### Clone and Build

```bash
# Clone the repository
git clone <repository-url>
cd AES

# Build (Release)
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j

# Build (Debug with sanitizers)
cmake -S . -B build-san -DCMAKE_BUILD_TYPE=Debug -DAES_ENABLE_SANITIZERS=ON
cmake --build build-san -j
```

### Verify Setup

```bash
# Run tests
./build/aes_tests tests/test_vectors

# Run sanitizer tests
./build-san/aes_tests tests/test_vectors

# Run benchmarks
./build/aes_benchmark --impl scratch --op encrypt --size 1024 --reps 3 --csv /tmp/test.csv
```

---

## Project Structure

```
AES/
├── src/                    # Source code
│   ├── aes_core.hpp        # Implementation A header
│   ├── aes_core.cpp        # Implementation A source
│   ├── aes_gcm_openssl.hpp # Implementation B header
│   ├── aes_gcm_openssl.cpp # Implementation B source
│   ├── aes_scratch_main.cpp# Scratch CLI
│   ├── aes_openssl_main.cpp# OpenSSL CLI
│   ├── test_main.cpp       # Test suite
│   └── benchmark.cpp       # Benchmark
├── tests/                  # Test data
│   ├── test_plan.md        # Test plan
│   └── test_vectors/       # NIST CAVP .rsp files
├── scripts/                # Automation scripts
├── results/                # Benchmark and test results
├── reports/                # Generated reports
├── docs/                   # Documentation
└── figures/                # Generated SVG plots
```

---

## Coding Standards

### C++ Style

- **C++ Standard**: C++17 or later
- **Naming**: `snake_case` for functions and variables, `PascalCase` for classes, `SCREAMING_SNAKE_CASE` for constants
- **Headers**: Use `#pragma once` for include guards
- **Namespaces**: Use `aes::` for Implementation A, `aesgcm::` for Implementation B
- **Types**: Use `std::uint8_t`, `std::size_t`, `std::vector`, `std::array` — not raw pointers or C-style arrays
- **Error Handling**: Use exceptions (`std::runtime_error` subclasses) for errors, return codes for validation
- **Comments**: Use `//` for single-line, `/* */` for multi-line. Document the "why", not the "what"

### Security-Critical Code

- **Never log or print key material** — use generic error messages
- **Use constant-time operations** for any production cryptographic code
- **Validate all inputs** — check sizes, null pointers, and ranges
- **Use RAII** for all resources (OpenSSL contexts, file handles)
- **Never use ECB mode** for real data — use GCM or another authenticated mode

### Compiler Warnings

The project builds with `-Wall -Wextra -Wpedantic`. All warnings must be resolved:

```cmake
# In CMakeLists.txt
add_compile_options(-Wall -Wextra -Wpedantic)
```

---

## Testing Requirements

### Before Submitting Changes

1. **All tests must pass**:
   ```bash
   ./build/aes_tests tests/test_vectors
   # Expected: Total checks: 1431, Failures: 0
   ```

2. **Sanitizer tests must pass**:
   ```bash
   ./build-san/aes_tests tests/test_vectors
   # Expected: Total checks: 1431, Failures: 0
   ```

3. **Zero compiler warnings**:
   ```bash
   cmake --build build --clean-first 2>&1 | grep -i warning
   # Expected: no output
   ```

4. **Benchmarks must run**:
   ```bash
   ./build/aes_benchmark --impl openssl-gcm --op encrypt --size 1024 --reps 3 --csv /tmp/test.csv
   ```

### Adding New Tests

When adding new functionality, add corresponding tests to `test_main.cpp`:

1. **Known-answer tests**: Add test vectors from NIST standards
2. **Round-trip tests**: Verify encrypt-then-decrypt recovers plaintext
3. **Negative tests**: Verify invalid input is rejected
4. **Boundary tests**: Test edge cases (empty input, maximum size, etc.)

### Test Naming Convention

```cpp
void test_<category>_<description>() {
    section("<Category>. <Description>");
    // Test logic
    check(condition, "description of what is being checked");
}
```

---

## Commit Conventions

### Commit Message Format

```
<type>: <description>

[optional body]
```

### Types

| Type | Description |
|---|---|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `test` | Adding or modifying tests |
| `bench` | Benchmark changes |
| `docs` | Documentation changes |
| `refactor` | Code refactoring |
| `style` | Code style changes (formatting, etc.) |
| `chore` | Build system, dependencies, etc. |

### Examples

```
feat: add AES-128 key expansion validation

Add FIPS 197 §5.2 key expansion test vectors to verify
round key 0, w[4], and round key 10 match the specification.

test: add GCM tampering tests for modified AAD

Verify that modifying additional authenticated data causes
GCM authentication failure and no plaintext is released.

docs: add architecture diagrams

Add Mermaid diagrams for system components, AES round flow,
key expansion, and GCM encrypt/decrypt sequence.
```

### Commit Granularity

- One logical change per commit
- Do not bundle unrelated changes
- Keep commits small and focused

---

## Pull Request Process

1. **Create a feature branch**: `git checkout -b feat/my-feature`
2. **Make changes**: Follow coding standards and testing requirements
3. **Run all tests**: Verify tests, sanitizers, and benchmarks pass
4. **Update documentation**: Update relevant docs if behavior changes
5. **Commit**: Use conventional commit messages
6. **Push**: `git push origin feat/my-feature`
7. **Open PR**: Describe what changed, why, and how it was tested
8. **Address review**: Respond to feedback and make requested changes

---

## Code Review Checklist

Before submitting a PR, verify:

- [ ] All tests pass (`./build/aes_tests tests/test_vectors`)
- [ ] Sanitizer tests pass (`./build-san/aes_tests tests/test_vectors`)
- [ ] Zero compiler warnings
- [ ] New functionality has corresponding tests
- [ ] Documentation is updated
- [ ] No key material or sensitive data in code or comments
- [ ] No ECB mode usage for real data
- [ ] RAII used for all resources
- [ ] Inputs are validated
- [ ] Error messages are generic (no key/plaintext leakage)

---

## Reporting Issues

When reporting issues, include:

1. **Description**: What the issue is
2. **Steps to reproduce**: How to trigger it
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**: OS, compiler, OpenSSL version
6. **Relevant code**: Minimal reproduction case

---

## Security Issues

If you discover a security vulnerability:

1. **Do not open a public issue**
2. **Report privately** to the maintainers
3. **Include**: Description, impact, steps to reproduce, and suggested fix
4. **Allow time** for a fix before public disclosure

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project. See `LICENSE` for details.
