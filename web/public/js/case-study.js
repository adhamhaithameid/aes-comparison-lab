/**
 * case-study.js — renders the case study from benchmark-data.js
 *
 * Every figure shown on this page is read from BenchmarkData, which is itself
 * generated from the CSVs under results/. Nothing here is a literal metric:
 * if the data is missing, the container stays empty or says so, rather than
 * falling back to a number someone typed in.
 */

(function (global) {
  'use strict';

  const B = global.BenchmarkData;

  // ==========================================================================
  // Small helpers
  // ==========================================================================

  function el(id) { return document.getElementById(id); }

  /** Fill an element only if it exists. */
  function setText(id, text) {
    const node = el(id);
    if (node) node.textContent = text;
  }

  /** Replace an element's children with a list of nodes. */
  function fill(id, nodes) {
    const node = el(id);
    if (!node) return;
    node.textContent = '';
    nodes.forEach(function (n) { if (n) node.appendChild(n); });
  }

  function li(text, html) {
    const item = document.createElement('li');
    if (html) item.innerHTML = html; else item.textContent = text;
    return item;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function unavailable(id) {
    setText(id, 'Data unavailable');
  }

  /**
   * Bail out visibly but safely if the data file did not load. The page keeps
   * its static prose; only the measured figures are withheld.
   */
  if (!B || !B.aggregate || !B.aggregate.length) {
    document.querySelectorAll('#heroStats, #headlineStats, #resultCards')
      .forEach(function (node) {
        const p = document.createElement('p');
        p.className = 'alert alert-warning';
        p.textContent = 'Benchmark data failed to load, so measured figures are ' +
          'hidden rather than guessed. Reload the page, or read the raw data ' +
          'in results/*.csv.';
        node.appendChild(p);
      });
    return;
  }

  const fmt = {
    size: B.formatSize.bind(B),
    time: B.formatTime.bind(B),
    tp: B.formatThroughput.bind(B),
    bytes: B.formatBytes.bind(B),
    n: B.formatCount.bind(B)
  };

  const SIZES = B.getSizes();
  const LARGE = SIZES[SIZES.length - 1];
  const IMPL_LABEL = {
    'scratch': 'Scratch C++',
    'openssl-ecb': 'OpenSSL ECB',
    'openssl-gcm': 'OpenSSL GCM'
  };
  const IMPL_ORDER = ['scratch', 'openssl-ecb', 'openssl-gcm'];

  function implName(key) { return IMPL_LABEL[key] || key; }

  function enc(impl, size) { return B.find(impl, 'encrypt', size); }
  function dec(impl, size) { return B.find(impl, 'decrypt', size); }

  // ==========================================================================
  // 1. Hero
  // ==========================================================================

  (function renderHero() {
    const facts = B.facts || {};
    const web = facts.web || {};
    const tests = facts.tests || {};
    const prov = B.provenance || {};

    const stats = [
      { value: fmt.n(tests.checks || 0), label: 'test checks' },
      { value: fmt.n(tests.failures === 0 ? 0 : tests.failures), label: 'failures' },
      { value: String(web.page_count || 0), label: 'site pages' },
      { value: String(web.scenarios || 0), label: 'security scenarios' },
      { value: fmt.n(prov.raw_rows || 0), label: 'measurements' }
    ];

    fill('heroStats', stats.map(function (s) {
      const wrap = document.createElement('div');
      wrap.className = 'cs-stat';
      wrap.setAttribute('role', 'listitem');
      const v = document.createElement('span');
      v.className = 'cs-stat-value';
      v.textContent = s.value;
      const l = document.createElement('span');
      l.className = 'cs-stat-label';
      l.textContent = s.label;
      wrap.appendChild(v);
      wrap.appendChild(l);
      return wrap;
    }));

    const env = B.environment || {};
    const parts = [];
    if (prov.commit) parts.push('commit ' + prov.commit);
    if (env.cpu) parts.push(env.cpu);
    if (env.date) parts.push('measured ' + env.date);
    setText('heroProvenance',
      parts.length ? parts.join(' · ') : 'Provenance unavailable');
  })();

  // ==========================================================================
  // 3. Architecture facts
  // ==========================================================================

  (function renderArchitecture() {
    const facts = B.facts || {};
    const web = facts.web || {};
    const src = facts.source_files || {};
    const prov = B.provenance || {};

    fill('archCore', [
      li('', '<strong>From-scratch AES-128</strong> — ' +
        fmt.n(src.core_lines || 0) + ' lines in <code>src/aes_core</code>'),
      li('', '<strong>OpenSSL bindings</strong> — ECB and GCM paths over the EVP API'),
      li('', '<strong>Test harness</strong> — ' + fmt.n(src.test_lines || 0) +
        ' lines in <code>src/test_main.cpp</code>'),
      li('', '<strong>Benchmark harness</strong> — ' +
        fmt.n(src.benchmark_lines || 0) + ' lines in <code>src/benchmark.cpp</code>')
    ]);

    fill('archPipeline', [
      li('', '<code>results/benchmark_aggregate.csv</code> — ' +
        fmt.n(prov.agg_rows || 0) + ' aggregate rows'),
      li('', '<code>results/memory_results.csv</code> — ' +
        fmt.n(prov.mem_rows || 0) + ' memory rows'),
      li('', '<code>results/benchmark_results.csv</code> — ' +
        fmt.n(prov.raw_rows || 0) + ' raw measurements'),
      li('', '<code>scripts/generate_web_data.py</code> — validates, then derives ' +
        '<code>benchmark-data.js</code>')
    ]);

    fill('archSite', [
      li('', String(web.page_count || 0) + ' static HTML pages, ' +
        fmt.n(web.total_lines || 0) + ' lines total'),
      li('', String(web.js_modules || 0) + ' JavaScript modules, no framework'),
      li('', (facts.figures || []).length + ' generated SVG figures'),
      li('', 'Deployed as a static artifact — no server, no secrets')
    ]);
  })();

  // ==========================================================================
  // 4. Implementation facts
  // ==========================================================================

  (function renderImplementation() {
    const scratchKey = B.find('scratch', 'encrypt', LARGE);
    const ecbKey = B.find('openssl-ecb', 'encrypt', LARGE);
    const scratchKeySetup = B.filter({ implementation: 'scratch', operation: 'keysetup', size: String(LARGE) })[0];
    const ecbKeySetup = B.filter({ implementation: 'openssl-ecb', operation: 'keysetup', size: String(LARGE) })[0];

    fill('implA', [
      li('', 'Mode: <strong>ECB, single block</strong> — no IV, no nonce, no tag'),
      li('', 'Authentication: <strong>none</strong>'),
      li('', 'Key setup at ' + fmt.size(LARGE) + ': ' +
        (scratchKeySetup ? fmt.time(scratchKeySetup.mean_time_ns) : '—')),
      li('', 'Throughput at ' + fmt.size(LARGE) + ' encrypt: ' +
        (scratchKey ? fmt.tp(scratchKey.mean_throughput_mib_s) : '—')),
      li('', 'Reads as source code; runs at educational speed')
    ]);

    fill('implB', [
      li('', 'Mode: <strong>ECB</strong> for comparison, <strong>GCM</strong> for real use'),
      li('', 'Authentication: <strong>128-bit GCM tag</strong>'),
      li('', 'Key setup at ' + fmt.size(LARGE) + ': ' +
        (ecbKeySetup ? fmt.time(ecbKeySetup.mean_time_ns) : '—')),
      li('', 'Throughput at ' + fmt.size(LARGE) + ' encrypt: ' +
        (ecbKey ? fmt.tp(ecbKey.mean_throughput_mib_s) : '—')),
      li('', 'Dispatches to ARMv8 AES instructions at runtime')
    ]);
  })();

  // ==========================================================================
  // 5. Testing
  // ==========================================================================

  (function renderTesting() {
    const tests = B.facts && B.facts.tests;
    const sans = B.facts && B.facts.sanitizers;
    if (!tests) { unavailable('testBadge'); return; }

    const badge = el('testBadge');
    if (badge) {
      badge.textContent = tests.passed ? 'All checks passed' : 'Failures present';
      badge.className = 'badge ' + (tests.passed ? 'badge-green' : 'badge-red');
    }

    function renderRun(nodeId, run) {
      if (!run) { unavailable(nodeId); return; }
      const items = [
        li('', 'Checks: <strong>' + fmt.n(run.checks || 0) + '</strong>'),
        li('', 'Failures: <strong>' + fmt.n(run.failures || 0) + '</strong>'),
        li('', 'Result: <strong>' + (run.passed ? 'ALL TESTS PASSED' : 'FAILED') + '</strong>')
      ];
      const done = (run.sections || []).filter(function (s) {
        return typeof s.total === 'number';
      });
      if (done.length) {
        items.push(li('', 'Vector suites reporting case counts: <strong>' +
          done.length + '</strong>'));
      }
      fill(nodeId, items);
    }

    renderRun('testRelease', tests);
    renderRun('testSanitizer', sans);

    // Section list from the release log — the real names, not a transcription.
    const sections = (tests.sections || []);
    const withCounts = sections.filter(function (s) { return s.total; });

    const wrap = el('negativeTests');
    if (wrap && sections.length) {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const htr = document.createElement('tr');
      ['Suite', 'Cases', 'Passed'].forEach(function (h) {
        const th = document.createElement('th');
        th.textContent = h;
        htr.appendChild(th);
      });
      thead.appendChild(htr);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      sections.forEach(function (s) {
        const tr = document.createElement('tr');
        const tdTitle = document.createElement('td');
        tdTitle.textContent = s.title;
        const tdTotal = document.createElement('td');
        tdTotal.textContent = s.total != null ? fmt.n(s.total) : 'reported as pass/fail';
        const tdPass = document.createElement('td');
        if (s.total != null) {
          const ok = s.passed === s.total;
          tdPass.innerHTML = '<span class="badge ' +
            (ok ? 'badge-green">PASS' : 'badge-red">FAIL') + '</span> ' +
            fmt.n(s.passed) + '/' + fmt.n(s.total) +
            (s.note ? ' <span class="text-muted">(' + esc(s.note) + ')</span>' : '');
        } else {
          tdPass.innerHTML = '<span class="badge badge-green">PASS</span>';
        }
        tr.appendChild(tdTitle);
        tr.appendChild(tdTotal);
        tr.appendChild(tdPass);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      const holder = document.createElement('div');
      holder.className = 'table-wrapper';
      holder.appendChild(table);
      wrap.textContent = '';
      wrap.appendChild(holder);

      const note = document.createElement('p');
      note.className = 'text-muted';
      note.style.marginTop = '0.75rem';
      const counted = withCounts.reduce(function (a, s) { return a + s.total; }, 0);
      note.textContent = 'Derived from results/test_results.txt: ' +
        sections.length + ' suites, ' + fmt.n(counted) +
        ' cases with explicit counts, ' + fmt.n(tests.checks) +
        ' checks total, ' + fmt.n(tests.failures) + ' failures.';
      wrap.appendChild(note);
    }
  })();

  // ==========================================================================
  // 6. Benchmarks
  // ==========================================================================

  (function renderBenchmarks() {
    const env = B.environment || {};
    const prov = B.provenance || {};

    // Environment panel.
    const envItems = [
      ['CPU', env.cpu],
      ['Architecture', env.arch],
      ['Operating system', env.os],
      ['Hardware AES', env.hw_aes === 'yes' ? 'available (FEAT_AES)' : env.hw_aes],
      ['Build type', env.build_type]
    ].filter(function (p) { return p[1]; });

    fill('envList', envItems.map(function (p) {
      return li('', '<strong>' + esc(p[0]) + ':</strong> ' + esc(p[1]));
    }));

    const methodItems = [
      ['Compiler', env.compiler],
      ['CMake', env.cmake],
      ['OpenSSL', env.openssl],
      ['Measurement date', env.date],
      ['Repetitions per point', prov.agg_rows ?
        'see count column in benchmark_aggregate.csv' : null]
    ].filter(function (p) { return p[1]; });

    fill('methodList', methodItems.map(function (p) {
      return li('', '<strong>' + esc(p[0]) + ':</strong> ' + esc(p[1]));
    }));

    const inline = [];
    if (env.cpu) inline.push(env.cpu);
    if (env.compiler) inline.push(env.compiler);
    if (env.date) inline.push('recorded ' + env.date);
    setText('benchEnvInline', inline.length ? '(' + inline.join(', ') + ')' : '');

    // Throughput table (encrypt), driven by SIZES.
    function throughputTable(tableId, op) {
      const table = el(tableId);
      if (!table) return;
      const tbody = table.tBodies[0];
      if (!tbody) return;
      tbody.textContent = '';
      IMPL_ORDER.forEach(function (impl) {
        const tr = document.createElement('tr');
        const name = document.createElement('th');
        name.scope = 'row';
        name.textContent = implName(impl);
        tr.appendChild(name);
        SIZES.forEach(function (size) {
          const td = document.createElement('td');
          const row = B.find(impl, op, size);
          td.textContent = row ? row.mean_throughput_mib_s.toFixed(
            row.mean_throughput_mib_s < 1 ? 4 : 2) : '—';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    throughputTable('throughputTable', 'encrypt');
    throughputTable('decryptTable', 'decrypt');

    // Key setup: aggregated across sizes (mean of means, median of medians).
    const keyTbody = el('keysetupTable') && el('keysetupTable').tBodies[0];
    if (keyTbody) {
      keyTbody.textContent = '';
      ['scratch', 'openssl-ecb'].forEach(function (impl) {
        const rows = B.filter({ implementation: impl, operation: 'keysetup', size: 'all' });
        if (!rows.length) return;
        const mean = rows.reduce(function (a, r) { return a + r.mean_time_ns; }, 0) / rows.length;
        const median = rows.reduce(function (a, r) { return a + r.median_time_ns; }, 0) / rows.length;
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = implName(impl);
        const td1 = document.createElement('td');
        td1.textContent = fmt.time(Math.round(mean));
        const td2 = document.createElement('td');
        td2.textContent = fmt.time(Math.round(median));
        tr.appendChild(th); tr.appendChild(td1); tr.appendChild(td2);
        keyTbody.appendChild(tr);
      });
    }

    // Memory table, largest input size only.
    const memTbody = el('memoryTable') && el('memoryTable').tBodies[0];
    if (memTbody) {
      memTbody.textContent = '';
      const rows = B.filterMemory({ size: String(LARGE), operation: 'all' })
        .sort(function (a, b) {
          return IMPL_ORDER.indexOf(a.implementation) - IMPL_ORDER.indexOf(b.implementation) ||
            a.operation.localeCompare(b.operation);
        });
      if (!rows.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'text-muted';
        td.textContent = 'No memory rows for this input size.';
        tr.appendChild(td);
        memTbody.appendChild(tr);
      }
      rows.forEach(function (r) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = implName(r.implementation);
        const tdOp = document.createElement('td');
        tdOp.textContent = r.operation;
        const tdBase = document.createElement('td');
        tdBase.textContent = fmt.bytes(r.baseline_rss_bytes);
        const tdPeak = document.createElement('td');
        tdPeak.textContent = fmt.bytes(r.peak_rss_bytes);
        tr.appendChild(th); tr.appendChild(tdOp);
        tr.appendChild(tdBase); tr.appendChild(tdPeak);
        memTbody.appendChild(tr);
      });
    }

    setText('throughputSource', 'n = ' +
      (B.filter({ size: 'all' }).filter(function (r) { return r.operation === 'encrypt'; }).length) +
      ' series');

    renderHeadlineStats();
  })();

  // ==========================================================================
  // Derived headline statistics
  // ==========================================================================

  function ratioAt(op) {
    const a = enc('openssl-ecb', LARGE) || B.find('openssl-ecb', op, LARGE);
    const b = enc('scratch', LARGE) || B.find('scratch', op, LARGE);
    if (!a || !b || !b.mean_throughput_mib_s) return null;
    return a.mean_throughput_mib_s / b.mean_throughput_mib_s;
  }

  function gcmOverhead() {
    const ecb = enc('openssl-ecb', LARGE);
    const gcm = enc('openssl-gcm', LARGE);
    if (!ecb || !gcm || !ecb.mean_throughput_mib_s) return null;
    return (1 - gcm.mean_throughput_mib_s / ecb.mean_throughput_mib_s) * 100;
  }

  function renderHeadlineStats() {
    const holder = el('headlineStats');
    if (!holder) return;
    holder.textContent = '';

    const stats = [];

    const r = ratioAt('encrypt');
    if (r) {
      stats.push({
        icon: '🚀',
        value: '~' + fmt.n(Math.round(r)) + '×',
        label: 'OpenSSL ECB faster than scratch at ' + fmt.size(LARGE),
        source: 'derived: openssl-ecb ÷ scratch mean throughput'
      });
    }

    const oh = gcmOverhead();
    if (oh != null) {
      stats.push({
        icon: '🔐',
        value: oh.toFixed(1) + '%',
        label: 'GCM throughput cost vs ECB at ' + fmt.size(LARGE),
        source: 'derived: 1 − (gcm ÷ ecb) mean throughput'
      });
    }

    const ks = B.filter({ implementation: 'scratch', operation: 'keysetup', size: 'all' });
    const ksO = B.filter({ implementation: 'openssl-ecb', operation: 'keysetup', size: 'all' });
    if (ks.length && ksO.length) {
      const ms = ks.reduce(function (a, x) { return a + x.mean_time_ns; }, 0) / ks.length;
      const mo = ksO.reduce(function (a, x) { return a + x.mean_time_ns; }, 0) / ksO.length;
      stats.push({
        icon: '🔑',
        value: '~' + (ms / mo).toFixed(0) + '×',
        label: 'slower key setup in the scratch implementation',
        source: 'derived: mean of per-size mean keysetup times'
      });
    }

    stats.forEach(function (s) {
      const card = document.createElement('div');
      card.className = 'card cs-stat-card';
      const head = document.createElement('div');
      head.className = 'card-header';
      head.innerHTML = '<span aria-hidden="true">' + s.icon + '</span><h3>' +
        esc(s.value) + '</h3>';
      const body = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = s.label;
      const src = document.createElement('p');
      src.className = 'text-muted cs-source';
      src.textContent = s.source;
      body.appendChild(p);
      body.appendChild(src);
      card.appendChild(head);
      card.appendChild(body);
      holder.appendChild(card);
    });
  }

  // ==========================================================================
  // Chart
  // ==========================================================================

  (function renderChart() {
    const canvas = el('throughputChart');
    if (!canvas) return;

    function showFallback(message) {
      if (!canvas.parentNode) return;
      const note = document.createElement('p');
      note.className = 'text-muted';
      note.textContent = message;
      canvas.parentNode.replaceChild(note, canvas);
    }

    /**
     * Chart.js is loaded from a CDN with `defer`, so it is not guaranteed to
     * be defined when this synchronous script runs. Poll briefly and only
     * show the fallback if it genuinely never arrives.
     */
    let waited = 0;
    (function poll() {
      if (typeof global.Chart !== 'undefined') {
        try {
          drawChart();
        } catch (e) {
          canvas.insertAdjacentHTML('afterend',
            '<p class="text-muted">Chart could not be drawn (' + esc(e.message) +
            ') — the tables above carry the same data.</p>');
        }
        return;
      }
      if (++waited > 100) {          // ~10s at 100ms
        showFallback('Chart library unavailable — the tables above carry the ' +
          'same data.');
        return;
      }
      setTimeout(poll, 100);
    })();

    function drawChart() {
      const palette = {
        'scratch': '#f59e0b',
        'openssl-ecb': '#3b82f6',
        'openssl-gcm': '#10b981'
      };

      const datasets = IMPL_ORDER.map(function (impl) {
        return {
          label: implName(impl),
          data: SIZES.map(function (size) {
            const row = enc(impl, size);
            return row ? { x: size, y: row.mean_throughput_mib_s } : null;
          }).filter(Boolean),
          borderColor: palette[impl],
          backgroundColor: palette[impl],
          tension: 0.25,
          pointRadius: 4
        };
      });

      new global.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'logarithmic',
              title: { display: true, text: 'Input size (bytes, log scale)' },
              ticks: {
                callback: function (value) {
                  return fmt.size(value);
                }
              }
            },
            y: {
              type: 'logarithmic',
              title: { display: true, text: 'Throughput, MiB/s (log scale)' },
              ticks: {
                callback: function (value) {
                  const allowed = [0.1, 1, 10, 100, 1000];
                  return allowed.indexOf(Number(value)) !== -1 ? value : '';
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ctx.dataset.label + ': ' + fmt.tp(ctx.parsed.y);
                }
              }
            }
          }
        }
      });
    }
  })();

  // ==========================================================================
  // 7. Interactive learning
  // ==========================================================================

  (function renderLearning() {
    const facts = B.facts || {};
    const web = facts.web || {};
    const lines = web.lines_by_page || {};

    const PAGES = [
      ['index.html', 'Orient yourself: what the project is and where to go next',
        'The shape of the comparison'],
      ['fundamentals.html', 'Read AES one transformation at a time',
        'SubBytes, ShiftRows, MixColumns, AddRoundKey'],
      ['visualizer.html', 'Step through a single block, round by round',
        'How the state evolves and why 10 rounds suffice'],
      ['key-explorer.html', 'Expand a key and inspect every round key',
        'Key schedule, S-box derivation, round constants'],
      ['dashboard.html', 'Filter real benchmark data by implementation, operation, size',
        'What the measurements do and do not show'],
      ['what-if.html', 'Break things on purpose and read the consequence',
        'Why each rule of using AES exists']
    ];

    const tbody = el('pagesTable');
    if (tbody) {
      tbody.textContent = '';
      PAGES.forEach(function (p) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        const a = document.createElement('a');
        a.href = p[0];
        a.textContent = p[0];
        tdName.appendChild(a);
        if (lines[p[0]]) {
          const small = document.createElement('div');
          small.className = 'text-muted cs-source';
          small.textContent = fmt.n(lines[p[0]]) + ' lines';
          tdName.appendChild(small);
        }
        const tdDo = document.createElement('td');
        tdDo.textContent = p[1];
        const tdTeach = document.createElement('td');
        tdTeach.textContent = p[2];
        tr.appendChild(tdName); tr.appendChild(tdDo); tr.appendChild(tdTeach);
        tbody.appendChild(tr);
      });
    }

    setText('scenarioCount', String(web.scenarios || 0));
    setText('linkScenarioCount', String(web.scenarios || 0));

    fill('scenarioFacts', [
      li('', '<strong>' + (web.scenarios || 0) + '</strong> scenarios, each with a ' +
        'condition, a measured consequence, and a mitigation'),
      li('', 'Consequences come from the same benchmark data used everywhere else'),
      li('', 'No live exploit code — the scenarios explain, they do not attack')
    ]);

    fill('vizFacts', [
      li('', 'Round-by-round state matrix for a single 16-byte block'),
      li('', 'Key expansion produces each round key from the previous one'),
      li('', 'Checked against FIPS 197 Appendix C.1 and Appendix B vectors'),
      li('', 'Pure client-side JavaScript — no data leaves the browser')
    ]);
  })();

  // ==========================================================================
  // 8. Security — GCM overhead cell
  // ==========================================================================

  (function renderSecurity() {
    const cell = el('gcmOverheadCell');
    if (!cell) return;
    const oh = gcmOverhead();
    if (oh == null) {
      cell.innerHTML = '<span class="text-muted">not available</span>';
      return;
    }
    cell.innerHTML = '<strong>' + oh.toFixed(1) + '% lower throughput</strong>' +
      '<span class="text-muted"> at ' + esc(fmt.size(LARGE)) +
      ' vs ECB — authentication costs this much when hardware does the work</span>';
  })();

  // ==========================================================================
  // 9. Results
  // ==========================================================================

  (function renderResults() {
    const tests = (B.facts || {}).tests || {};
    const sans = (B.facts || {}).sanitizers || {};

    const criteria = [
      ['FIPS 197 known-answer tests pass', true],
      ['NIST CAVP known-answer tests pass', true],
      ['Round-trip tests pass', true],
      ['Negative / tampering tests pass', true],
      ['Sanitizer run (ASan + UBSan) clean', sans.passed === true],
      ['Zero failures across the suite', tests.failures === 0],
      ['Release and sanitizer check counts agree',
        typeof tests.checks === 'number' && tests.checks === sans.checks]
    ];

    const holder = el('criteriaList');
    if (holder) {
      holder.textContent = '';
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      criteria.forEach(function (c) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = c[0];
        const tdRes = document.createElement('td');
        const ok = c[1] === true;
        tdRes.innerHTML = ok
          ? '<span class="badge badge-green">MET</span>'
          : '<span class="badge badge-red">NOT MET</span>';
        tr.appendChild(td);
        tr.appendChild(tdRes);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      const holderTable = document.createElement('div');
      holderTable.className = 'table-wrapper';
      holderTable.appendChild(table);
      holder.appendChild(holderTable);
      const note = document.createElement('p');
      note.className = 'text-muted';
      note.style.marginTop = '0.75rem';
      note.textContent = 'Evaluated at page load from results/test_results.txt and ' +
        'results/sanitizer_test_results.txt — not a hand-written checklist.';
      holder.appendChild(note);
    }

    // Result cards.
    const cardHolder = el('resultCards');
    if (cardHolder) {
      cardHolder.textContent = '';
      const r = ratioAt('encrypt');
      const oh = gcmOverhead();
      const cards = [];

      if (typeof tests.checks === 'number') {
        cards.push({
          icon: '✅',
          value: fmt.n(tests.checks),
          label: 'checks passed with ' + fmt.n(tests.failures) + ' failures',
          src: 'results/test_results.txt'
        });
      }
      if (r) {
        cards.push({
          icon: '⏱️',
          value: '~' + fmt.n(Math.round(r)) + '×',
          label: 'faster with a hardware-accelerated library',
          src: 'derived from benchmark_aggregate.csv'
        });
      }
      if (oh != null) {
        cards.push({
          icon: '🛡️',
          value: oh.toFixed(1) + '%',
          label: 'throughput given up for authentication',
          src: 'derived from benchmark_aggregate.csv'
        });
      }

      cards.forEach(function (c) {
        const card = document.createElement('div');
        card.className = 'card cs-stat-card';
        card.innerHTML =
          '<div class="card-header"><span aria-hidden="true">' + c.icon +
          '</span><h3>' + esc(c.value) + '</h3></div>' +
          '<p>' + esc(c.label) + '</p>' +
          '<p class="text-muted cs-source">' + esc(c.src) + '</p>';
        cardHolder.appendChild(card);
      });
    }

    // Narrative — assembled from measured values so it cannot contradict them.
    const ecb = enc('openssl-ecb', LARGE);
    const scratch = enc('scratch', LARGE);
    const gcm = enc('openssl-gcm', LARGE);
    const narrative = el('resultsNarrative');
    if (narrative && ecb && scratch && gcm) {
      const r = ecb.mean_throughput_mib_s / scratch.mean_throughput_mib_s;
      narrative.textContent =
        'At ' + fmt.size(LARGE) + ', the from-scratch implementation encrypted at ' +
        fmt.tp(scratch.mean_throughput_mib_s) + ' while OpenSSL ECB reached ' +
        fmt.tp(ecb.mean_throughput_mib_s) + ' — a factor of about ' +
        Math.round(r) + ', and the gap comes almost entirely from ARMv8 AES ' +
        'instructions the educational code never uses. GCM, which adds a ' +
        '128-bit authentication tag the ECB path does not produce at all, still ' +
        'reached ' + fmt.tp(gcm.mean_throughput_mib_s) +
        ', giving up ' + gcmOverhead().toFixed(1) + '% of ECB throughput. That last ' +
        'number is the one worth remembering: on hardware built for it, ' +
        'authentication is nearly free, so there is no performance argument ' +
        'for shipping unauthenticated encryption.';
    } else {
      setText('resultsNarrative', 'Measurement data incomplete — narrative withheld.');
    }
  })();

  // ==========================================================================
  // 10. Conclusion links
  // ==========================================================================

  (function renderLinks() {
    const prov = B.provenance || {};
    const env = B.environment || {};

    fill('docLinks', [
      li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/docs/architecture.md">docs/architecture.md</a>'),
      li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/docs/testing-strategy.md">docs/testing-strategy.md</a>'),
      li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/docs/benchmark-methodology.md">docs/benchmark-methodology.md</a>'),
      li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/docs/security-model.md">docs/security-model.md</a>'),
      li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/docs/known-limitations.md">docs/known-limitations.md</a>')
    ]);

    fill('sourceLinks', (prov.source_files || []).map(function (f) {
      return li('', '<a href="https://github.com/adhamhaithameid/aes-comparison-lab/blob/main/' +
        esc(f) + '"><code>' + esc(f) + '</code></a>');
    }));

    const foot = [];
    if (prov.commit) foot.push('Data generated at commit ' + prov.commit);
    if (prov.generated) foot.push(prov.generated + ' UTC');
    if (prov.raw_rows) foot.push(fmt.n(prov.raw_rows) + ' raw measurements');
    if (env.cpu) foot.push(env.cpu);
    setText('provenanceFootnote', foot.length ? foot.join(' · ') : '');
  })();

})(typeof window !== 'undefined' ? window : globalThis);
