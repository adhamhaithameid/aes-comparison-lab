# Demo Checklist

## Environment Setup
- [ ] macOS or Linux with clang/g++, CMake 3.16+, OpenSSL, Python 3
- [ ] Web browser (Chrome/Firefox/Safari)
- [ ] Projectile terminal or IDE

## Pre-Demo (15 min before)
- [ ] Clone/build the project from a clean checkout
- [ ] Run `./scripts/run_regression.sh` — all tests must pass
- [ ] Start the web server (`cd web && npx serve public` or `python3 -m http.server`)
- [ ] Open all web pages and verify they load:
  - [ ] Landing page (index.html)
  - [ ] Fundamentals (fundamentals.html)
  - [ ] Visualizer (visualizer.html)
  - [ ] Key Explorer (key-explorer.html)
  - [ ] Dashboard (dashboard.html)
  - [ ] What If? Lab (what-if.html)
- [ ] Verify the visualizer produces correct FIPS 197 Appendix B states
- [ ] Verify all 12 What If? scenarios work

## Demo Flow
- [ ] Introduction (1 min)
- [ ] AES basics on fundamentals page (2 min)
- [ ] Visualizer walkthrough with FIPS 197 App. B (3 min)
- [ ] Key expansion explorer (1-2 min)
- [ ] What If? lab — 2-3 scenarios (3 min)
- [ ] Benchmark dashboard (1-2 min)
- [ ] Conclusion and Q&A (1 min)

## Backup Plans
- [ ] If web server fails: use screenshots from the repository
- [ ] If browser crashes: restart and reload pages
- [ ] If visualizer fails: show the C++ roundtrace CLI output instead
- [ ] If network is down: all demos work offline (no external dependencies)

## Key Evidence to Show
- [ ] `./build/aes_tests tests/test_vectors` — 1,431 checks pass
- [ ] `./build/aes_scratch kat` — FIPS 197 KATs pass
- [ ] `./build/aes_openssl selftest` — GCM KAT passes
- [ ] `results/benchmark_aggregate.csv` — real performance data
- [ ] Sanitizer test results — zero findings
