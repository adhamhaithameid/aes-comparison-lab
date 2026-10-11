# AES Education Platform

An interactive web platform for learning the Advanced Encryption Standard (AES) through visualization, exploration, and hands-on security scenarios.

## Features

- **Landing Page** — Overview of the platform with navigation to all modules
- **Fundamentals** — Core AES concepts: plaintext/ciphertext, keys, symmetric encryption, block sizes, AES-128/192/256, rounds, key expansion, block cipher vs mode, confidentiality vs integrity, authenticated encryption
- **Round Visualizer** — Interactive AES-128 round-by-round visualization using the FIPS 197 Appendix B test vector
- **Key Expansion Explorer** — Step-through of RotWord, SubWord, Rcon, and XOR operations
- **Implementation Dashboard** — Real benchmark data comparing scratch C++, OpenSSL ECB, and OpenSSL GCM
- **What If? Security Lab** — 12 interactive security scenarios

## Project Structure

```
web/
├── public/
│   ├── index.html          # Landing page
│   ├── fundamentals.html   # AES fundamentals
│   ├── visualizer.html     # Round visualizer
│   ├── key-explorer.html   # Key expansion explorer
│   ├── dashboard.html      # Implementation dashboard
│   ├── what-if.html        # Security lab (12 scenarios)
│   ├── css/
│   │   └── style.css       # Design system with dark/light themes
│   └── js/
│       ├── main.js         # Theme toggle, navigation, utilities
│       ├── aes-js.js       # Educational AES-128 implementation
│       ├── visualizer.js   # Round visualizer logic
│       ├── key-explorer.js # Key expansion explorer logic
│       ├── dashboard.js    # Dashboard logic with Chart.js
│       ├── what-if.js      # What If? lab logic (12 scenarios)
│       └── benchmark-data.js # Embedded benchmark data
├── tests/
│   ├── visualizer.test.js  # Playwright tests for visualizer
│   └── what-if.test.js     # Playwright tests for What If? lab
├── package.json
└── README.md
```

## Running Locally

### Simple HTTP Server

```bash
cd web
npx serve public -p 3000
```

Then open http://localhost:3000 in your browser.

### Python Alternative

```bash
cd web/public
python3 -m http.server 3000
```

## Running Tests

```bash
cd web
npm install
npx playwright install
npm test
```

## Educational Disclaimer

**All JavaScript AES implementations in this project are for educational purposes only.**

- ⚠️ **NOT for production use**
- No constant-time protections
- No side-channel resistance
- No hardware acceleration
- Slow, clear reference implementation

For production use, always use established libraries like OpenSSL, libsodium, or the Web Crypto API.

## Technology Stack

- **HTML5** — Semantic markup with ARIA labels
- **CSS3** — Custom properties for theming, responsive grid, dark/light modes
- **JavaScript (Vanilla)** — No frameworks, educational AES implementation
- **Chart.js** — Benchmark data visualization (CDN)
- **Mermaid.js** — Architecture diagrams (CDN)
- **Playwright** — End-to-end testing

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
