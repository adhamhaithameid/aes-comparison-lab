# Product Enhancement Plan — AES Comparison Lab → CryptoTool-class Platform

**Goal:** Evolve this repository from a course assignment into a self-serve,
product-grade cryptography learning platform comparable to CrypTool, where any
visitor can understand, explore, and use AES (and related primitives) without
prior knowledge.

**Owner:** adham haitham eid (320230021)
**Status:** Draft v1 — planning only (no code changes yet)

---

## 1. Vision & Positioning

- **One-line:** "An interactive, open-source AES laboratory: learn it, visualize
  it, break it, benchmark it."
- **Differentiator vs CrypTool:** CrypTool is breadth-first (many algorithms).
  This product is **depth-first on AES** with real implementations, real
  benchmarks, and real attack demos. Position as the *definitive AES deep-dive*,
  not a general crypto suite.
- **Secondary expansion (Phase 3+):** Add a small set of adjacent primitives
  (SHA-256, HMAC, RSA toy, Diffie-Hellman) only where they illuminate AES
  (e.g., AES-GCM = AES + GHASH, key derivation).

## 2. Target Personas

1. **Student** (undergrad crypto/security course) — needs guided lessons,
   known-answer tests, step-by-step rounds.
2. **Practitioner** (dev integrating crypto) — needs "which mode?", "is this
   safe?", benchmark numbers, copy-pasteable code.
3. **Curious visitor** (no background) — needs plain-language intros, glossary,
   "what is a block cipher?".
4. **Educator** — needs lesson plans, slides, exportable figures, quiz bank.

## 3. Gap Analysis vs CrypTool

| Capability | CrypTool | This repo | Gap |
|---|---|---|---|
| Algorithm breadth | Many | AES only | Medium (intentional) |
| Step-through visualization | Yes | Yes (rounds + key expansion) | Low |
| Encrypt/decrypt playground | Yes | CLI only | **High** |
| File encryption in browser | Yes | No | **High** |
| Modes (CBC/CTR/GCM/ECB) compare | Yes | GCM only | **High** |
| Padding (PKCS#7) demo | Yes | No | Medium |
| Known-answer test browser | Yes | Docs only | Medium |
| Glossary / help tooltips | Yes | Docs only | Medium |
| Plugin/extensibility | Yes | No | Low (Phase 4) |
| Offline/desktop app | Yes | Web only | Medium |
| Accessibility (a11y) | Partial | Unknown | Audit needed |
| i18n | Yes | English only | Low (Phase 4) |
| Mobile responsive | Partial | Unknown | Audit needed |

## 4. Product Pillars

### A. Learn (content)
- Guided learning paths: Beginner → Intermediate → Advanced.
- Each concept page: definition, analogy, diagram, interactive demo, quiz.
- Glossary with hover tooltips everywhere (reuse `docs/glossary.md`).
- "Common mistakes" callouts (ECB for images, nonce reuse, no auth).

### B. Visualize (exploration)
- Keep: Round Visualizer, Key Expansion Explorer.
- Add: **Block/Modes Visualizer** (ECB/CBC/CTR/CFB/OFB/GCM side-by-side
  on a sample image/text) showing leakage.
- Add: **MixColumns Deep-Dive** (xtime vs tables, GF(2^8) arithmetic).
- Add: **Padding Visualizer** (PKCS#7).

### C. Play (hands-on)
- **In-browser AES playground**: enter key + plaintext → ciphertext + rounds,
  using the existing `aes-js.js` (already present).
- **File encrypt/decrypt** in browser (Web Crypto API + our JS impl for
  teaching; clearly marked "educational, not production").
- **Tamper lab**: flip bits, see GCM fail (already in What If? — promote to
  a top-level "Attack Lab").

### D. Measure (data)
- Keep dashboard; add: throughput comparison charts by mode, hardware accel
  toggle, "your machine" benchmark (WebAssembly or JS timing).
- Export results as CSV/PNG.

### E. Reference (docs)
- API reference for C++ library (Doxygen).
- "How to use AES correctly" checklist (mode, nonce, key mgmt, auth).
- Security model + threat model (already in docs — surface in UI).

## 5. Information Architecture (site map)

```
Home
├── Learn
│   ├── What is AES?
│   ├── Block ciphers & modes
│   ├── Key expansion
│   ├── AES-GCM & authentication
│   └── Common mistakes
├── Visualize
│   ├── Round visualizer (existing)
│   ├── Key expansion explorer (existing)
│   ├── Modes visualizer (NEW)
│   └── MixColumns / GF(2^8) (NEW)
├── Play
│   ├── AES playground (NEW)
│   ├── File encrypt/decrypt (NEW)
│   └── Tamper / attack lab (promote What If?)
├── Measure
│   ├── Implementation dashboard (existing)
│   └── Run benchmark on your machine (NEW)
├── Reference
│   ├── Glossary (NEW, interactive)
│   ├── API docs (NEW, Doxygen)
│   ├── Security model (existing docs)
│   └── Known-answer tests (NEW browser)
├── Quiz (existing)
└── About / Contribute
```

## 6. Technical Enhancements

1. **Search** — client-side full-text search across pages (e.g., Fuse.js or
   Pagefind) so visitors find concepts fast.
2. **Progress tracking** — localStorage-based "completed lessons" + quiz best
   score (quiz already saves best score; extend).
3. **Deep linking** — each visualizer step has a shareable URL hash.
4. **Accessibility** — WCAG 2.2 audit, keyboard nav, screen-reader labels,
   reduced-motion respect (run `accessibility-audit`).
5. **Performance** — lazy-load Chart.js, code-split JS, Lighthouse ≥ 90.
6. **PWA** — service worker + manifest for offline use (CrypTool-like
   offline desktop feel).
7. **Theming** — keep dark/light; add high-contrast mode.
8. **Testing** — expand Playwright E2E to cover new pages; add visual
   regression (screenshot compare).
9. **CI** — deploy preview per PR (GitHub Pages environments).

## 7. Content & Documentation Deliverables

- `docs/lesson-plans.md` (educator guide).
- `docs/api/` Doxygen output.
- Interactive glossary page generated from `docs/glossary.md`.
- "How to use AES correctly" one-pager (PDF export).
- Video walkthroughs (optional, Phase 3).

## 8. Packaging & Distribution

- **Web (primary):** GitHub Pages (already).
- **Desktop (Phase 3):** Tauri or Electron wrapper of the web app for offline
  use (CrypTool parity).
- **Library (Phase 2):** Publish C++ headers as a small reusable library +
  Python package (`aes-compare` on PyPI) for the Python module.
- **Docker (Phase 2):** `docker run` to serve the site + run tests.

## 9. Community & Governance

- `CONTRIBUTING.md` exists — extend with "how to add a lesson" and
  "how to add a scenario".
- Issue templates already present — add "content request" template.
- Add `CODE_OF_CONDUCT.md` (exists) — verify.
- Roadmap public on GitHub Projects; changelog maintained (exists).

## 10. Phased Roadmap

### Phase 1 — "Understandable by anyone" (2–3 weeks)
- [ ] Rewrite Home as a guided entry point with 3 paths (Learn/Play/Measure).
- [ ] Add interactive Glossary page.
- [ ] Add "What is AES?" beginner lesson with analogies.
- [ ] Promote What If? to top-level "Attack Lab" with plain-language lessons.
- [ ] Accessibility audit + fixes (keyboard, contrast, reduced motion).
- [ ] Search (Pagefind) across all pages.
- [ ] Mobile responsiveness pass.

### Phase 2 — "Hands-on" (3–4 weeks)
- [ ] In-browser AES playground (encrypt/decrypt, show rounds).
- [ ] Modes visualizer (ECB/CBC/CTR/GCM on sample image).
- [ ] Padding visualizer.
- [ ] File encrypt/decrypt in browser (educational, clearly labeled).
- [ ] Known-answer test browser (paste hex → verify).
- [ ] Deep-linking for visualizer steps.
- [ ] Progress tracking (localStorage).

### Phase 3 — "Product-grade" (4–6 weeks)
- [ ] PWA + offline support.
- [ ] Desktop wrapper (Tauri).
- [ ] "Run benchmark on your machine" (JS/WASM timing).
- [ ] Doxygen API docs published.
- [ ] Educator lesson plans + PDF export.
- [ ] Python package publication.
- [ ] Docker image.

### Phase 4 — "Ecosystem" (ongoing)
- [ ] Additional primitives (SHA-256, HMAC, RSA toy) where they illuminate AES.
- [ ] Plugin system for new scenarios.
- [ ] i18n (start: Spanish, Arabic).
- [ ] Community contributions (scenario PRs).

## 11. Success Metrics

- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Time-to-first-understanding: new visitor completes "What is AES?" in < 5 min.
- Engagement: ≥ 3 page views/session, ≥ 1 interactive action/session.
- Quality: 0 a11y critical issues, 0 broken links in CI.
- Adoption: GitHub stars, forks, external links.

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scope creep (becoming CrypTool) | Stay depth-first on AES; adjacent primitives only if they illuminate AES. |
| Browser crypto misuse | Label everything "educational"; never present JS impl as production. |
| Maintenance burden | Automate (CI, data pipeline already exists); keep static site. |
| Content accuracy | Cross-check against FIPS 197 + NIST CAVP; cite sources. |

## 13. Immediate Next Actions (this week)

1. Run `accessibility-audit` on the live site; file issues.
2. Run Lighthouse on all pages; record baseline.
3. Draft Home page rewrite (3 paths) as a PR.
4. Add Pagefind search (1-day task).
5. Decide Tauri vs Electron for desktop (spike).

---

*This plan is a living document. Update as phases complete.*
