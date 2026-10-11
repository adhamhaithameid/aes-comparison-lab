# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

Please report security vulnerabilities by opening a private security advisory
on the GitHub repository. Do not open public issues for security bugs.

We aim to respond within 72 hours.

## Scope

This project is an **educational resource**. The from-scratch AES
implementation is NOT production-ready and must not be used to protect
real data. Only the OpenSSL GCM wrapper is suitable for real encryption,
and only when used correctly.

## What We Consider In Scope

- Bugs that cause the test suite to pass when it should fail
- Authentication bypasses in the OpenSSL wrapper
- Memory safety issues (buffer overflows, use-after-free)
- Incorrect known-answer test vectors
- Secret leakage in logs or output

## What We Consider Out of Scope

- Side-channel attacks on the from-scratch implementation (documented limitation)
- Vulnerabilities in OpenSSL itself (report to OpenSSL)
- The from-scratch implementation being slow (documented, expected)
- ECB mode pattern leakage (documented as a security lesson)
