# System Architecture

## Overview

The AES Comparison Project is a C++ software security project that implements and compares two approaches to AES-128 encryption:

- **Implementation A** — A from-scratch AES-128 block cipher following FIPS 197, designed for education and validation.
- **Implementation B** — An OpenSSL-based AES-128-GCM authenticated encryption wrapper, designed for production use.

The project includes a comprehensive test suite, performance benchmarks, memory profiling, and automated CI-style scripts.

---

## Overall System Components

```mermaid
graph TB
    subgraph "AES Comparison Project"
        subgraph "Implementation A — Scratch AES-128"
            A1[aes_core.hpp<br/>Class declaration]
            A2[aes_core.cpp<br/>Algorithm implementation]
            A3[aes_scratch_main.cpp<br/>CLI demo tool]
        end

        subgraph "Implementation B — OpenSSL AES-128-GCM"
            B1[aes_gcm_openssl.hpp<br/>Wrapper API]
            B2[aes_gcm_openssl.cpp<br/>OpenSSL EVP wrapper]
            B3[aes_openssl_main.cpp<br/>CLI file encryption tool]
        end

        subgraph "Testing & Validation"
            T1[test_main.cpp<br/>Automated test suite]
            T2[tests/test_plan.md<br/>Test plan document]
            T3[tests/test_vectors/<br/>NIST CAVP .rsp files]
        end

        subgraph "Performance & Profiling"
            BM[benchmark.cpp<br/>Performance benchmark]
            MR[memory_results.csv<br/>Memory profiling data]
            BR[benchmark_aggregate.csv<br/>Benchmark results]
        end

        subgraph "Automation & Reporting"
            S1[scripts/run_all.sh<br/>Complete workflow runner]
            S2[scripts/run_all.py<br/>Results aggregator]
            S3[reports/final_report.md<br/>Technical report]
            S4[reports/performance_analysis.md<br/>Performance analysis]
        end
    end

    A1 --> A2
    A2 --> A3
    B1 --> B2
    B2 --> B3
    A2 --> T1
    B2 --> T1
    T1 --> T2
    T1 --> T3
    A2 --> BM
    B2 --> BM
    BM --> BR
    BM --> MR
    S1 --> S2
    S2 --> S3
    S2 --> S4
```

---

## AES Encryption Round Flow (Implementation A)

AES-128 performs 10 rounds of transformation on a 128-bit state. Each round (except the last) applies four transformations in sequence.

```mermaid
flowchart TD
    INPUT[Plaintext Block<br/>16 bytes] --> ARK0[AddRoundKey 0<br/>XOR with Round Key 0]

    ARK0 --> R1[Round 1]
    R1 --> SB1[SubBytes<br/>S-box substitution]
    SB1 --> SR1[ShiftRows<br/>Row rotation]
    SR1 --> MC1[MixColumns<br/>GF multiplication]
    MC1 --> ARK1[AddRoundKey 1]

    ARK1 --> R2[Round 2]
    R2 --> SB2[SubBytes]
    SB2 --> SR2[ShiftRows]
    SR2 --> MC2[MixColumns]
    MC2 --> ARK2[AddRoundKey 2]

    ARK2 --> RD[... Rounds 3-9 ...]
    RD --> R10[Round 10 — Final]
    R10 --> SB10[SubBytes]
    SB10 --> SR10[ShiftRows]
    SR10 --> ARK10[AddRoundKey 10<br/>No MixColumns]

    ARK10 --> OUTPUT[Ciphertext Block<br/>16 bytes]

    KEY[128-bit Key] --> KE[Key Expansion<br/>11 round keys]
    KE --> ARK0
    KE --> ARK1
    KE --> ARK2
    KE --> ARK10
```

### Transformation Details

| Transformation | Operation | Purpose |
|---|---|---|
| **SubBytes** | Non-linear byte substitution via S-box | Confusion |
| **ShiftRows** | Cyclic left shift of each row by row index | Diffusion |
| **MixColumns** | GF(2^8) matrix multiplication per column | Diffusion |
| **AddRoundKey** | XOR state with round-specific subkey | Key mixing |

---

## AES Key Expansion Process

The 128-bit key is expanded into 11 round keys (176 bytes total) using the FIPS 197 key schedule.

```mermaid
flowchart LR
    KEY[128-bit Key<br/>16 bytes] --> SPLIT[Split into 4 words<br/>w0, w1, w2, w3]

    SPLIT --> RK0[Round Key 0<br/>w0 || w1 || w2 || w3]

    W3[w3] --> ROT[RotWord<br/>Cyclic left rotate]
    ROT --> SUB[SubWord<br/>S-box each byte]
    SUB --> RCON[XOR with Rcon<br/>Round constant]
    RCON --> W4[w4 = w0 XOR result]

    W4 --> RK1[Round Key 1<br/>w4 || w5 || w6 || w7]

    W4 --> W5[w5 = w1 XOR w4]
    W5 --> W6[w6 = w2 XOR w5]
    W6 --> W7[w7 = w3 XOR w6]

    W7 --> W8[w8 = w4 XOR SubWord-RotWord-w7 XOR Rcon]
    W8 --> RKN[Round Keys 2-10<br/>Same pattern repeats]

    RK0 --> SCHEDULE[RoundKeySchedule<br/>176 bytes]
    RK1 --> SCHEDULE
    RKN --> SCHEDULE
```

### Key Expansion Formula

For word index `i >= 4`:

- If `i mod 4 != 0`: `w[i] = w[i-4] XOR w[i-1]`
- If `i mod 4 = 0`: `w[i] = w[i-4] XOR SubWord(RotWord(w[i-1])) XOR Rcon[i/4]`

---

## OpenSSL GCM Encrypt/Decrypt Flow (Implementation B)

```mermaid
sequenceDiagram
    participant C as Caller
    participant W as aesgcm wrapper
    participant O as OpenSSL EVP

    Note over C,O: Encryption
    C->>W: encrypt(key, nonce, plaintext, aad)
    W->>O: EVP_EncryptInit_ex(ctx, AES-128-GCM)
    W->>O: EVP_EncryptUpdate(ctx, NULL, &len, aad, aad_len)
    W->>O: EVP_EncryptUpdate(ctx, ciphertext, &len, plaintext, pt_len)
    W->>O: EVP_EncryptFinal_ex(ctx, ciphertext+len, &len)
    W->>O: EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, tag)
    W-->>C: Encrypted{ciphertext, tag}

    Note over C,O: Decryption
    C->>W: decrypt(key, nonce, ciphertext, tag, aad)
    W->>O: EVP_DecryptInit_ex(ctx, AES-128-GCM)
    W->>O: EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, 16, tag)
    W->>O: EVP_DecryptUpdate(ctx, NULL, &len, aad, aad_len)
    W->>O: EVP_DecryptUpdate(ctx, plaintext, &len, ciphertext, ct_len)
    W->>O: EVP_DecryptFinal_ex(ctx, plaintext+len, &len)
    alt Tag verification succeeds
        W-->>C: optional{plaintext}
    else Tag verification fails
        W-->>C: nullopt (no plaintext released)
    end
```

---

## CLI Execution Sequence

### Scratch AES CLI (`aes_scratch_main`)

```mermaid
sequenceDiagram
    participant U as User
    participant CLI as aes_scratch_main
    participant A as AES128

    U->>CLI: ./aes_scratch_main <key_hex> <input_hex>
    CLI->>CLI: Parse hex key and input
    CLI->>A: AES128(key) — construct cipher
    A->>A: Key expansion (11 round keys)
    loop For each 16-byte block
        CLI->>A: encrypt_block(block)
        A->>A: 10 rounds of SubBytes/ShiftRows/MixColumns/AddRoundKey
    end
    CLI->>CLI: Output ciphertext hex
    CLI->>CLI: Decrypt and verify round-trip
    CLI-->>U: Ciphertext + verification result
```

### OpenSSL GCM CLI (`aes_openssl_main`)

```mermaid
sequenceDiagram
    participant U as User
    participant CLI as aes_openssl_main
    participant W as aesgcm wrapper
    participant O as OpenSSL

    U->>CLI: ./aes_openssl_main <encrypt|decrypt> <key_file> <input> <output>
    alt Encrypt
        CLI->>W: encrypt_with_random_nonce(key, plaintext)
        W->>O: RAND_bytes(nonce, 12)
        W->>O: EVP AES-128-GCM encrypt
        W-->>CLI: blob = nonce || ciphertext || tag
        CLI->>CLI: Write blob to output file
    else Decrypt
        CLI->>CLI: Read blob from input file
        CLI->>CLI: Parse nonce (12) || ciphertext (n) || tag (16)
        CLI->>W: decrypt_blob(key, blob)
        W->>O: EVP AES-128-GCM decrypt + tag verify
        alt Tag valid
            W-->>CLI: plaintext
            CLI->>CLI: Write plaintext to output file
        else Tag invalid
            W-->>CLI: nullopt
            CLI->>CLI: Error: authentication failed
        end
    end
```

---

## Data Flow

```mermaid
flowchart LR
    subgraph "Implementation A — Scratch AES-128"
        direction TB
        PA[Plaintext<br/>16-byte blocks] --> ECB[ECB per-block<br/>validation only]
        KA[128-bit Key] --> ECB
        ECB --> CA[Ciphertext<br/>16-byte blocks]
        CA --> DEC[ECB decrypt]
        KA --> DEC
        DEC --> PA2[Recovered Plaintext]
    end

    subgraph "Implementation B — OpenSSL AES-128-GCM"
        direction TB
        PB[Plaintext<br/>arbitrary length] --> GCM[GCM encrypt]
        KB[128-bit Key] --> GCM
        NB[96-bit Nonce<br/>random per encryption] --> GCM
        AADB[Optional AAD] --> GCM
        GCM --> CB[Ciphertext<br/>same length as plaintext]
        GCM --> TAG[128-bit Tag]
        CB --> GCMD[GCM decrypt]
        KB --> GCMD
        NB --> GCMD
        TAG --> GCMD
        AADB --> GCMD
        GCMD --> PB2[Recovered Plaintext<br/>or nullopt on failure]
    end
```

### Data Formats

| Artifact | Implementation A | Implementation B |
|---|---|---|
| Key | 16 bytes (raw) | 16 bytes (raw) |
| Nonce/IV | N/A | 12 bytes (random) |
| Plaintext | Multiple of 16 bytes | Arbitrary length |
| Ciphertext | Same as plaintext | Same as plaintext |
| Authentication | None | 16-byte tag |
| AAD | N/A | Optional, arbitrary length |
| File format | N/A | `nonce(12) \|\| tag(16) \|\| ciphertext(n)` |

---

## Testing/CI Pipeline

```mermaid
flowchart TD
    START([scripts/run_all.sh]) --> BUILD[Build with CMake<br/>Release mode]
    BUILD --> TEST[Run test suite<br/>aes_tests]
    TEST --> CHECK1{All tests pass?}
    CHECK1 -->|Yes| SAN[Build with sanitizers<br/>ASan + UBSan]
    CHECK1 -->|No| FAIL1[Report failure]

    SAN --> SANTEST[Run sanitizer tests]
    SANTEST --> CHECK2{Sanitizer clean?}
    CHECK2 -->|Yes| BENCH[Run benchmarks<br/>aes_benchmark]
    CHECK2 -->|No| FAIL2[Report sanitizer finding]

    BENCH --> MEM[Run memory profiling<br/>/usr/bin/time -l]
    MEM --> AGG[Aggregate results<br/>run_all.py]
    AGG --> REPORT[Generate reports<br/>final_report.md + performance_analysis.md]
    REPORT --> FIG[Generate figures<br/>SVG plots]
    FIG --> DONE([Complete])
```

### Test Suite Structure

The test suite (`test_main.cpp`) is organized into six categories:

| Category | Description | Test Count |
|---|---|---|
| A | Known-answer tests (FIPS 197 + NIST CAVP) | 282 cases |
| B | Round-trip tests (scratch ECB + OpenSSL GCM) | 17 cases |
| C | Boundary tests (input sizes 0 to 10 MiB) | 14 cases |
| D | Negative/tampering tests | 36 cases |
| E | Cross-validation (scratch vs OpenSSL) | 1000 blocks |
| F | Determinism/regression checks | 5 checks |
| **Total** | | **1431 checks** |

---

## Benchmark Measurement Pipeline

```mermaid
flowchart TD
    subgraph "Benchmark Execution"
        B1[aes_benchmark binary] --> B2[Parse CLI args<br/>--impl --op --size --reps --warmup --csv]
        B2 --> B3[Generate random input<br/>seed 0xBEEF]
        B3 --> B4[Warmup iterations<br/>default 3]
        B4 --> B5[Timed repetitions<br/>std::chrono::steady_clock]
        B5 --> B6[Compute checksum<br/>prevent dead-code elimination]
        B6 --> B7[Write CSV row<br/>per repetition]
    end

    subgraph "Aggregation"
        A1[benchmark_results.csv<br/>per-rep data] --> A2[run_all.py<br/>aggregate statistics]
        A2 --> A3[benchmark_aggregate.csv<br/>mean, median, stdev, min, max]
    end

    subgraph "Memory Profiling"
        M1[/usr/bin/time -l<br/>peak RSS] --> M2[memory_results.csv<br/>per configuration]
    end

    subgraph "Reporting"
        R1[benchmark_aggregate.csv] --> R2[performance_analysis.md]
        M2 --> R2
        R2 --> R3[SVG figures<br/>throughput, latency, scaling]
    end
```

### Benchmark Configuration

| Parameter | Value |
|---|---|
| Input sizes | 16 B, 1 KiB, 100 KiB, 1 MiB, 10 MiB |
| Repetitions | 10 (small), 3 (1 MiB scratch), 2 (10 MiB scratch) |
| Warmup | 3 iterations |
| Timing | `std::chrono::steady_clock` (monotonic, ns resolution) |
| Optimization | `-O3` (Release) |
| Checksum | FNV-1a hash of output (prevent dead-code elimination) |
| Memory tool | `/usr/bin/time -l` (peak RSS on macOS) |

---

## Project File Structure

```
AES/
├── CMakeLists.txt              # Build configuration
├── README.md                   # Project overview
├── src/
│   ├── aes_core.hpp            # Implementation A header
│   ├── aes_core.cpp            # Implementation A source
│   ├── aes_gcm_openssl.hpp     # Implementation B header
│   ├── aes_gcm_openssl.cpp     # Implementation B source
│   ├── aes_scratch_main.cpp    # CLI demo (scratch)
│   ├── aes_openssl_main.cpp    # CLI file encryption (OpenSSL)
│   ├── test_main.cpp           # Automated test suite
│   └── benchmark.cpp           # Performance benchmark
├── tests/
│   ├── test_plan.md            # Test plan document
│   └── test_vectors/           # NIST CAVP .rsp files
│       ├── ECBGFSbox128.rsp
│       ├── ECBVarTxt128.rsp
│       ├── ECBVarKey128.rsp
│       ├── ECBMMT128.rsp
│       ├── gcmEncryptExtIV128_subset.rsp
│       └── gcmDecrypt128_subset.rsp
├── scripts/
│   ├── run_all.sh              # Complete workflow runner
│   ├── run_all.py              # Results aggregator
│   └── extract_gcm_subset.py   # GCM test vector subsetter
├── results/
│   ├── test_results.txt        # Test suite output
│   ├── sanitizer_test_results.txt
│   ├── benchmark_results.csv   # Per-repetition data
│   ├── benchmark_aggregate.csv # Summary statistics
│   ├── memory_results.csv      # Memory profiling data
│   └── environment.txt         # System information
├── reports/
│   ├── final_report.md         # Technical report
│   └── performance_analysis.md # Performance analysis
├── docs/                       # Documentation (this directory)
└── figures/                    # Generated SVG plots
```
