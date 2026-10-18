# Educator Lesson Plans — AES Education Platform

## Lesson 1: What is encryption? (45 min)
- Objective: Understand symmetric encryption and why AES exists.
- Materials: `what-is-aes.html`, glossary.
- Activity: Locked-box analogy; discuss key sharing problem.
- Check: quiz questions 1–3.

## Lesson 2: AES internals (60 min)
- Objective: Trace one AES-128 block through all 10 rounds.
- Materials: `visualizer.html`, `key-explorer.html`.
- Activity: Step through rounds; identify SubBytes/ShiftRows/MixColumns/AddRoundKey.
- Check: oral quiz on round count and key expansion.

## Lesson 3: Modes and pattern leakage (45 min)
- Objective: Explain why ECB is insecure and how CBC/CTR/GCM help.
- Materials: `modes.html`.
- Activity: Render repeated text in ECB vs CBC; observe leakage.
- Check: write a one-paragraph explanation.

## Lesson 4: Authenticated encryption (45 min)
- Objective: Understand GCM, nonces, and tags.
- Materials: `what-if.html` (Attack Lab), `best-practices.html`.
- Activity: Run nonce-reuse and bit-flip scenarios; observe failure.
- Check: quiz questions on GCM.

## Lesson 5: Implementation and performance (60 min)
- Objective: Compare scratch vs OpenSSL; read benchmarks.
- Materials: `dashboard.html`, `case-study.html`.
- Activity: Interpret throughput table; discuss trade-offs.
- Check: short written reflection.
