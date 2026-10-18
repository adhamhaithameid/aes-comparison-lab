# AES-128 Implementation Comparison

**Author:** adham haitham eid (Student ID: 320230021)

## Implementations
- **Version A:** AES-128 with MixColumns computed using `xtime` operations.
- **Version B:** Same AES-128 implementation, but MixColumns uses precomputed multiplication-by-2 and multiplication-by-3 lookup tables.
- The number of rounds, S-box, transformation order, key, input data, and 16-byte block processing are identical.

## Correctness evidence
Before timing, both implementations were checked against the AES-128 test vector from FIPS 197:
- Key: `000102030405060708090a0b0c0d0e0f`
- Plaintext: `00112233445566778899aabbccddeeff`
- Expected ciphertext: `69c4e0d86a7b0430d8cdb78070b4c55a`

Both versions produced the expected ciphertext. The program also checks that both versions produce identical ciphertext for each benchmark input size before collecting timings.

## Timing method
Input sizes are 16, 1,024, and 4,096 bytes. Input generation and correctness checks happen outside the timer. Each of 7 samples measures 10 encryptions, and the median sample time is reported. Timing uses Python's high-resolution `time.perf_counter_ns()` timer. The same Python process, key, and input bytes are used for both versions.

## Results

| Input size | Version A time (ms) | Version B time (ms) |
|---|---:|---:|
| 16 bytes | 0.0679 | 0.0598 |
| 1,024 bytes | 3.0256 | 2.5298 |
| 4,096 bytes | 12.5676 | 10.7852 |

## Discussion
Version B (lookup tables) was faster in these measurements for all three input sizes. It avoids repeated `xtime` calculations in MixColumns by looking up multiplication results. The tradeoff is extra table memory and table lookups.

## Environment and run instructions
- OS: Windows-11-10.0.26200-SP0
- CPU: ryzen 5 3600xt
- Language/runtime: Python 3.12.7
- Compiler/optimization settings: Not applicable; Python script, no separate compilation or optimization flags.
- Run: `python aes_compare.py`
