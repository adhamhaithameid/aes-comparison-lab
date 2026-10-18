// Lightweight client-side site search (Phase 1).
// Full-text Pagefind integration is a Phase 2 follow-up.
(function () {
  const pages = [
    { title: 'Home', url: 'index.html', desc: 'Guided entry point: Learn, Play, Measure.' },
    { title: 'Glossary', url: 'glossary.html', desc: 'Plain-language definitions of crypto terms.' },
    { title: 'What is AES?', url: 'what-is-aes.html', desc: 'Beginner introduction to AES with analogies.' },
    { title: 'Fundamentals', url: 'fundamentals.html', desc: 'AES concepts, block ciphers, modes, authenticated encryption.' },
    { title: 'Round Visualizer', url: 'visualizer.html', desc: 'Step through all 10 rounds of AES-128.' },
    { title: 'Modes Visualizer', url: 'modes.html', desc: 'ECB vs CBC vs CTR pattern leakage.' },
    { title: 'AES Playground', url: 'playground.html', desc: 'Encrypt/decrypt a 16-byte block in browser.' },
    { title: 'File Encrypt/Decrypt', url: 'file-crypto.html', desc: 'Educational in-browser file crypto (ECB+PKCS7).' },
    { title: 'Padding Visualizer', url: 'modes.html', desc: 'PKCS#7 padding demo.' },
    { title: 'Key Expansion Explorer', url: 'key-explorer.html', desc: 'RotWord, SubWord, Rcon, XOR.' },
    { title: 'Implementation Dashboard', url: 'dashboard.html', desc: 'Scratch vs OpenSSL benchmarks.' },
    { title: 'Attack Lab', url: 'what-if.html', desc: '12 security scenarios.' },
    { title: 'Knowledge Quiz', url: 'quiz.html', desc: '10 questions with feedback.' },
    { title: 'Case Study', url: 'case-study.html', desc: 'Engineering, performance, security write-up.' },
  ];

  const input = document.getElementById('siteSearch');
  const results = document.getElementById('searchResults');
  if (!input || !results) return;

  function render(q) {
    q = q.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = pages.filter(p =>
      p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
    );
    if (!matches.length) {
      results.innerHTML = '<li><span style="padding:.5rem .75rem;display:block;color:var(--text-muted);">No results</span></li>';
      results.hidden = false;
      return;
    }
    results.innerHTML = matches.map(p =>
      `<li><a href="${p.url}">${p.title}</a><div style="padding:0 .75rem .4rem;font-size:.75rem;color:var(--text-muted);">${p.desc}</div></li>`
    ).join('');
    results.hidden = false;
  }

  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 200));
  input.addEventListener('focus', e => render(e.target.value));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { results.hidden = true; input.blur(); }
  });
})();
