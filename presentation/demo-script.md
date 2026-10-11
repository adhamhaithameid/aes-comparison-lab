# Demo Script (10–15 minutes)

## Before the Demo

- [ ] Build the project: `cmake -S . -B build && cmake --build build -j`
- [ ] Verify tests pass: `./build/aes_tests tests/test_vectors`
- [ ] Start the web server: `cd web && npm run dev` (or `python3 -m http.server`)
- [ ] Open the web app in a browser
- [ ] Have the FIPS 197 Appendix B test vector ready:
  - Key: `2b7e151628aed2a6abf7158809cf4f3c`
  - Plaintext: `3243f6a8885a308d313198a2e0370734`

## The Demo

### 1. Introduction (1 min)
"Good morning/afternoon. Today I'll demonstrate an AES implementation
comparison project. AES is the world's most widely used symmetric cipher.
We built two implementations: one from scratch in C++ for education, and one
using OpenSSL for production-grade authenticated encryption."

### 2. AES Basics (2 min)
- Show the AES fundamentals page on the web app
- Explain: 128-bit blocks, 4×4 state matrix, 10 rounds for AES-128
- Key point: AES is a block cipher, not an encryption mode

### 3. Interactive Visualizer (3 min)
- Navigate to the visualizer page
- Enter the FIPS 197 Appendix B test vector
- Step through: AddRoundKey → SubBytes → ShiftRows → MixColumns → AddRoundKey
- Show the state changing at each step
- Point out: "These are the exact intermediate states from the FIPS 197 standard"
- Jump to the final round and show the ciphertext

### 4. Key Expansion Explorer (1-2 min)
- Navigate to the key explorer
- Show how the 16-byte key becomes 11 round keys
- Highlight RotWord, SubWord, Rcon operations

### 5. What If? Security Lab (3 min)
- Navigate to the "What If?" lab
- **Scenario 1**: Flip a bit in the ciphertext → show GCM rejection
- **Scenario 4**: Demonstrate nonce reuse (educational only)
- **Scenario 10**: Show ECB pattern leakage with a repeated pattern
- Key takeaway: "Authentication matters. GCM detects tampering; raw AES doesn't."

### 6. Benchmark Dashboard (1-2 min)
- Show the comparison dashboard
- Point out: OpenSSL is ~2,100x faster (hardware acceleration)
- GCM costs only ~3% over raw ECB
- Memory scales linearly with input size

### 7. Conclusion (1 min)
- From-scratch: great for learning, not for production
- OpenSSL GCM: use this for real encryption
- Always verify with known-answer tests
- Q&A

## If Something Goes Wrong

- If the web app doesn't load: try `python3 -m http.server 8080` from `web/public/`
- If a test fails: run `./build/aes_tests tests/test_vectors` to debug
- If the visualizer shows wrong states: verify against FIPS 197 Appendix B
- If benchmarks seem off: run `./scripts/run_benchmarks.sh` to regenerate

## Key Numbers to Mention

| Metric | Value |
|--------|-------|
| Total tests | 1,431 checks, 0 failures |
| NIST CAVP ECB cases | 273 pass |
| NIST CAVP GCM cases | 36 pass (incl. 13 FAIL) |
| OpenSSL throughput | ~712 MiB/s |
| Scratch throughput | ~0.3 MiB/s |
| Speedup | ~2,100x |
