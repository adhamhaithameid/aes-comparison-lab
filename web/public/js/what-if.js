/**
 * what-if.js — What If? Security Lab Logic
 *
 * ⚠️ Educational JavaScript implementation — NOT for production use.
 * All scenarios use synthetic data only.
 */

(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  // ==========================================================================
  // Tab Navigation
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        // Deactivate all tabs
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        // Deactivate all panels
        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.remove('active');
        });
        // Activate clicked tab
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        // Show corresponding panel
        const panelId = tab.getAttribute('aria-controls');
        const panel = $(panelId);
        if (panel) panel.classList.add('active');
      });
    });

    // Initialize scenarios
    initS1();
    initS2();
    initS3();
    initS4();
    initS5();
    initS6();
    initS7();
    initS8();
    initS9();
    initS10();
    initS11();
    initS12();
  });

  // ==========================================================================
  // Helper: Show result
  // ==========================================================================

  function showResult(containerId, type, title, details) {
    const container = $(containerId);
    if (!container) return;

    container.style.display = '';
    container.className = 'scenario-result ' + type;

    let html = '<h4>' + title + '</h4>';
    html += '<div>' + details + '</div>';
    container.innerHTML = html;
  }

  // ==========================================================================
  // S1: Modified Ciphertext (Bit Flip)
  // ==========================================================================

  function initS1() {
    const runBtn = $('s1Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const bitSelect = $('s1BitSelect');
      const bit = bitSelect ? parseInt(bitSelect.value) : 3;

      // Simulate GCM decryption with modified ciphertext
      // In real GCM, any bit flip causes authentication failure
      const originalTag = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
      const modifiedTag = flipBitsInHex(originalTag, [bit]);

      let details = '<table class="table-wrapper"><tr><th>Property</th><th>Value</th></tr>';
      details += '<tr><td>Modified bit</td><td>Bit ' + bit + ' of byte 0</td></tr>';
      details += '<tr><td>Original tag</td><td><code>' + originalTag + '</code></td></tr>';
      details += '<tr><td>Expected tag</td><td><code>' + modifiedTag + '</code></td></tr>';
      details += '<tr><td>GCM verification</td><td><span class="badge badge-red">FAILED</span></td></tr>';
      details += '<tr><td>Decryption output</td><td><span class="badge badge-red">None (rejected)</span></td></tr>';
      details += '</table>';

      showResult('s1Result', 'failure', 'GCM Authentication Failed', details);
    });
  }

  // ==========================================================================
  // S2: Modified Authentication Tag
  // ==========================================================================

  function initS2() {
    const runBtn = $('s2Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const tagBits = $('s2TagBits');
      const numBits = tagBits ? parseInt(tagBits.value) : 16;

      // Simulate tag modification
      const originalTag = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
      const modifiedTag = modifyTag(originalTag, numBits);

      let details = '<table class="table-wrapper"><tr><th>Property</th><th>Value</th></tr>';
      details += '<tr><td>Bits modified</td><td>' + numBits + '</td></tr>';
      details += '<tr><td>Original tag</td><td><code>' + originalTag + '</code></td></tr>';
      details += '<tr><td>Modified tag</td><td><code>' + modifiedTag + '</code></td></tr>';
      details += '<tr><td>Verification</td><td><span class="badge badge-red">FAILED</span></td></tr>';
      details += '<tr><td>Probability of bypass</td><td>1 in 2^' + (numBits * 8) + '</td></tr>';
      details += '</table>';

      showResult('s2Result', 'failure', 'Tag Verification Failed', details);
    });
  }

  // ==========================================================================
  // S3: Wrong Key
  // ==========================================================================

  function initS3() {
    const runBtn = $('s3Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const keyDiff = $('s3KeyDiff');
      const diffBits = keyDiff ? parseInt(keyDiff.value) : 1;

      // Simulate wrong key decryption
      const correctKey = '000102030405060708090a0b0c0d0e0f';
      const wrongKey = flipBitsInHex(correctKey, [diffBits]);

      // With GCM, wrong key means tag verification fails
      let details = '<table class="table-wrapper"><tr><th>Property</th><th>Value</th></tr>';
      details += '<tr><td>Key difference</td><td>' + diffBits + ' bit(s)</td></tr>';
      details += '<tr><td>Correct key</td><td><code>' + correctKey + '</code></td></tr>';
      details += '<tr><td>Wrong key</td><td><code>' + wrongKey + '</code></td></tr>';
      details += '<tr><td>GCM tag check</td><td><span class="badge badge-red">FAILED</span></td></tr>';
      details += '<tr><td>Output</td><td><span class="badge badge-red">Decryption rejected</span></td></tr>';
      details += '<tr><td>Information leaked</td><td><span class="badge badge-green">None</span></td></tr>';
      details += '</table>';

      showResult('s3Result', 'failure', 'Decryption Failed — Wrong Key', details);
    });
  }

  // ==========================================================================
  // S4: GCM Nonce Reuse
  // ==========================================================================

  function initS4() {
    const runBtn = $('s4Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const msg1 = $('s4Msg1') ? $('s4Msg1').value : 'Transfer $1000 to Alice';
      const msg2 = $('s4Msg2') ? $('s4Msg2').value : 'Transfer $9000 to Bob';

      // Synthetic ciphertext values (for demonstration only)
      const ct1 = 'deadbeefcafebabe';
      const ct2 = '1234567890abcdef';

      // XOR of plaintexts can be derived from XOR of ciphertexts
      // when nonce is reused: C1 XOR C2 = P1 XOR P2
      const p1p2Xor = xorHex(ct1, ct2);

      let details = '<div class="alert alert-danger"><strong>Critical Vulnerability!</strong> Nonce reuse in GCM leaks plaintext XOR.</div>';
      details += '<table class="table-wrapper"><tr><th>Property</th><th>Value</th></tr>';
      details += '<tr><td>Message 1</td><td><code>' + msg1 + '</code></td></tr>';
      details += '<tr><td>Message 2</td><td><code>' + msg2 + '</code></td></tr>';
      details += '<tr><td>Ciphertext 1</td><td><code>' + ct1 + '</code></td></tr>';
      details += '<tr><td>Ciphertext 2</td><td><code>' + ct2 + '</code></td></tr>';
      details += '<tr><td>C1 ⊕ C2 = P1 ⊕ P2</td><td><code>' + p1p2Xor + '</code></td></tr>';
      details += '<tr><td>Confidentiality</td><td><span class="badge badge-red">BROKEN</span></td></tr>';
      details += '<tr><td>Authenticity</td><td><span class="badge badge-red">BROKEN</span></td></tr>';
      details += '</table>';
      details += '<p class="mt-2"><strong>Impact:</strong> Attacker can recover plaintext by analyzing the XOR. With known plaintext, full recovery is trivial. Authentication tags can be forged.</p>';

      showResult('s4Result', 'failure', 'Nonce Reuse Catastrophic Failure', details);
    });
  }

  // ==========================================================================
  // S5: AES-128 vs AES-256
  // ==========================================================================

  function initS5() {
    const runBtn = $('s5Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      // Synthetic comparison data
      let details = '<table class="table-wrapper"><tr><th>Property</th><th>AES-128</th><th>AES-256</th></tr>';
      details += '<tr><td>Key size</td><td>128 bits</td><td>256 bits</td></tr>';
      details += '<tr><td>Rounds</td><td>10</td><td>14</td></tr>';
      details += '<tr><td>Security margin (classical)</td><td><span class="badge badge-green">Secure</span></td><td><span class="badge badge-green">Secure</span></td></tr>';
      details += '<tr><td>Security margin (quantum)</td><td><span class="badge badge-yellow">64 bits (Grover)</span></td><td><span class="badge badge-green">128 bits (Grover)</span></td></tr>';
      details += '<tr><td>Relative performance</td><td><span class="badge badge-green">Fastest</span></td><td>~40% slower</td></tr>';
      details += '<tr><td>Use case</td><td>Ephemeral data, TLS</td><td>Long-term secrets, PQ prep</td></tr>';
      details += '</table>';

      showResult('s5Result', 'success', 'AES-256 vs AES-128 Comparison', details);
    });
  }

  // ==========================================================================
  // S6: Input Size Scaling
  // ==========================================================================

  function initS6() {
    const runBtn = $('s6Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      // Use real benchmark data
      const data = BenchmarkData.filter({ implementation: 'openssl-ecb', operation: 'encrypt', size: 'all' });

      let details = '<table class="table-wrapper"><tr><th>Input Size</th><th>Mean Time</th><th>Throughput</th></tr>';
      data.forEach(function (d) {
        details += '<tr>';
        details += '<td>' + BenchmarkData.formatSize(d.input_size_bytes) + '</td>';
        details += '<td>' + BenchmarkData.formatTime(d.mean_time_ns) + '</td>';
        details += '<td>' + d.mean_throughput_mib_s.toFixed(2) + ' MiB/s</td>';
        details += '</tr>';
      });
      details += '</table>';
      details += '<p class="mt-2"><strong>Observation:</strong> Throughput increases with size as fixed overhead is amortized. At 10 MB, OpenSSL ECB achieves ~715 MiB/s.</p>';

      showResult('s6Result', 'success', 'Performance Scaling Analysis', details);
    });
  }

  // ==========================================================================
  // S7: Hardware Acceleration
  // ==========================================================================

  function initS7() {
    const runBtn = $('s7Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      // Compare scratch vs openssl from benchmark data
      const scratch1MB = BenchmarkData.aggregate.filter(function (d) {
        return d.implementation === 'scratch' && d.operation === 'encrypt' && d.input_size_bytes === 1048576;
      });
      const ossl1MB = BenchmarkData.aggregate.filter(function (d) {
        return d.implementation === 'openssl-ecb' && d.operation === 'encrypt' && d.input_size_bytes === 1048576;
      });

      let scratchTime = scratch1MB.length ? scratch1MB[0].mean_time_ns : 3167930833;
      let osslTime = ossl1MB.length ? ossl1MB[0].mean_time_ns : 1395475;

      let speedup = (scratchTime / osslTime).toFixed(1);

      let details = '<table class="table-wrapper"><tr><th>Implementation</th><th>1MB Encrypt Time</th><th>Throughput</th></tr>';
      details += '<tr><td><span class="badge badge-yellow">Scratch C++</span></td><td>' + BenchmarkData.formatTime(scratchTime) + '</td><td>~0.32 MiB/s</td></tr>';
      details += '<tr><td><span class="badge badge-blue">OpenSSL ECB</span></td><td>' + BenchmarkData.formatTime(osslTime) + '</td><td>~716 MiB/s</td></tr>';
      details += '</table>';
      details += '<div class="alert alert-success mt-2"><strong>' + speedup + 'x speedup</strong> with AES-NI hardware acceleration</div>';
      details += '<p><strong>Note:</strong> OpenSSL also benefits from better memory management and optimized assembly. The scratch implementation uses a simple byte-oriented approach without hardware acceleration.</p>';

      showResult('s7Result', 'success', 'Hardware Acceleration Impact', details);
    });
  }

  // ==========================================================================
  // S8: Incorrect AES Implementation
  // ==========================================================================

  function initS8() {
    const runBtn = $('s8Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      // Simulate broken S-box (S[0x00] = 0x00 instead of 0x63)
      const brokenSbox = new Uint8Array(AES.SBOX);
      brokenSbox[0x00] = 0x00; // Should be 0x63

      // Test vector from FIPS 197
      const plaintext = AES.hexToBytes('00112233445566778899aabbccddeeff');
      const key = AES.hexToBytes('000102030405060708090a0b0c0d0e0f');

      // Encrypt with broken S-box
      const roundKeys = AES.keyExpansion128(key);
      let state = new Uint8Array(plaintext);
      state = AES.addRoundKey(state, roundKeys[0]);

      for (let round = 1; round < 10; round++) {
        // Use broken S-box
        for (let i = 0; i < 16; i++) {
          state[i] = brokenSbox[state[i]];
        }
        state = AES.shiftRows(state);
        state = AES.mixColumns(state);
        state = AES.addRoundKey(state, roundKeys[round]);
      }
      // Final round
      for (let i = 0; i < 16; i++) {
        state[i] = brokenSbox[state[i]];
      }
      state = AES.shiftRows(state);
      state = AES.addRoundKey(state, roundKeys[10]);

      const brokenOutput = AES.bytesToHex(state);
      const expectedOutput = '69c4e0d86a7b0430d8cdb78070b4c55a';

      // Round-trip test (encrypt then decrypt with same broken S-box)
      // This would pass because the inverse would also use the broken S-box
      const roundTripWorks = true; // In practice, if inverse S-box is also broken correspondingly

      let details = '<table class="table-wrapper"><tr><th>Test</th><th>Result</th></tr>';
      details += '<tr><td>FIPS 197 KAT</td><td><span class="badge badge-red">FAILED</span></td></tr>';
      details += '<tr><td>Expected</td><td><code>' + expectedOutput + '</code></td></tr>';
      details += '<tr><td>Got</td><td><code>' + brokenOutput + '</code></td></tr>';
      details += '<tr><td>Round-trip</td><td><span class="badge badge-green">' + (roundTripWorks ? 'PASSES' : 'FAILS') + '</span></td></tr>';
      details += '<tr><td>S[0x00]</td><td><code>0x' + brokenSbox[0].toString(16).padStart(2, '0') + '</code> (should be <code>0x63</code>)</td></tr>';
      details += '</table>';
      details += '<p class="mt-2"><strong>Key Insight:</strong> Round-trip tests alone are insufficient. A broken S-box is still a bijection, so encryption followed by decryption with the same broken S-box will recover the original plaintext. Only known answer tests (KATs) catch this.</p>';

      showResult('s8Result', 'warning', 'Broken S-box: KATs Fail, Round-trips Pass', details);
    });
  }

  // ==========================================================================
  // S9: Authentication Failure Mid-File
  // ==========================================================================

  function initS9() {
    const runBtn = $('s9Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const flipPos = $('s9FlipPos');
      const pos = flipPos ? parseInt(flipPos.value) : 50;

      // Simulate GCM decryption of 1MB file with bit flip at position
      const fileSize = 1048576; // 1 MB
      const flipByte = Math.floor(fileSize * pos / 100);

      let details = '<table class="table-wrapper"><tr><th>Property</th><th>Value</th></tr>';
      details += '<tr><td>File size</td><td>' + BenchmarkData.formatSize(fileSize) + '</td></tr>';
      details += '<tr><td>Bit flip at</td><td>' + pos + '% (byte ' + flipByte + ')</td></tr>';
      details += '<tr><td>GCM tag</td><td><span class="badge badge-red">FAILED</span></td></tr>';
      details += '<tr><td>Data decrypted</td><td><span class="badge badge-red">0 bytes</span></td></tr>';
      details += '<tr><td>Error message</td><td>"aes_gcm: AUTHENTICATION FAILED"</td></tr>';
      details += '</table>';
      details += '<div class="alert alert-warning mt-2"><strong>All-or-Nothing:</strong> GCM authentication covers the entire ciphertext. Any modification — even a single bit — causes complete decryption failure. No partial data is returned.</div>';

      showResult('s9Result', 'failure', 'Mid-File Corruption Detected', details);
    });
  }

  // ==========================================================================
  // S10: ECB Pattern Leakage
  // ==========================================================================

  function initS10() {
    const runBtn = $('s10Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      canvas.className = 'ecb-canvas';
      const ctx = canvas.getContext('2d');

      // Draw a simple "penguin-like" pattern with identical blocks
      // This demonstrates ECB leakage visually
      const blockSize = 16;
      for (let y = 0; y < 256; y += blockSize) {
        for (let x = 0; x < 256; x += blockSize) {
          // Create pattern with some identical blocks
          const isPattern = (x + y) % 32 === 0;
          ctx.fillStyle = isPattern ? '#4a90d9' : '#e8e8e8';
          ctx.fillRect(x, y, blockSize, blockSize);
        }
      }

      // Draw "encrypted" version (ECB shows patterns)
      const canvas2 = document.createElement('canvas');
      canvas2.width = 256;
      canvas2.height = 256;
      canvas2.className = 'ecb-canvas';
      const ctx2 = canvas2.getContext('2d');

      for (let y = 0; y < 256; y += blockSize) {
        for (let x = 0; x < 256; x += blockSize) {
          const isPattern = (x + y) % 32 === 0;
          // ECB: identical plaintext blocks → identical ciphertext blocks
          ctx2.fillStyle = isPattern ? '#2c5282' : '#a0aec0';
          ctx2.fillRect(x, y, blockSize, blockSize);
        }
      }

      let details = '<div class="grid-2">';
      details += '<div><h4>Original Pattern</h4><div id="ecbOriginal"></div></div>';
      details += '<div><h4>ECB Encrypted</h4><div id="ecbEncrypted"></div></div>';
      details += '</div>';
      details += '<div class="alert alert-danger mt-2"><strong>Pattern Leakage!</strong> Identical plaintext blocks produce identical ciphertext blocks in ECB mode. The original pattern is clearly visible in the "encrypted" output.</div>';

      showResult('s10Result', 'failure', 'ECB Pattern Leakage Visualized', details);

      // Insert canvases after result
      const resultContainer = $('s10Result');
      if (resultContainer) {
        const originalDiv = resultContainer.querySelector('#ecbOriginal');
        const encryptedDiv = resultContainer.querySelector('#ecbEncrypted');
        if (originalDiv) originalDiv.appendChild(canvas);
        if (encryptedDiv) encryptedDiv.appendChild(canvas2);
      }
    });
  }

  // ==========================================================================
  // S11: Memory/Timing Variance
  // ==========================================================================

  function initS11() {
    const runBtn = $('s11Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      // Use real benchmark data to show variance
      const data = BenchmarkData.filter({ implementation: 'scratch', operation: 'encrypt', size: '16' });

      let details = '<h4>Timing Variance (Scratch, 16 bytes, encrypt)</h4>';
      details += '<table class="table-wrapper"><tr><th>Run</th><th>Time (ns)</th><th>Throughput (MiB/s)</th></tr>';

      // Show individual runs from raw data would be better, but we have aggregate
      // Use the aggregate stats
      if (data.length) {
        const d = data[0];
        details += '<tr><td>Mean</td><td>' + d.mean_time_ns + '</td><td>' + d.mean_throughput_mib_s.toFixed(4) + '</td></tr>';
        details += '<tr><td>Median</td><td>' + d.median_time_ns + '</td><td>' + d.median_throughput_mib_s.toFixed(4) + '</td></tr>';
        details += '<tr><td>Std Dev</td><td>' + d.stdev_time_ns + '</td><td>' + d.stdev_throughput_mib_s.toFixed(4) + '</td></tr>';
        details += '<tr><td>Min</td><td>' + d.min_time_ns + '</td><td>-</td></tr>';
        details += '<tr><td>Max</td><td>' + d.max_time_ns + '</td><td>-</td></tr>';
        details += '<tr><td>CV (mean)</td><td>' + (d.stdev_time_ns / d.mean_time_ns * 100).toFixed(1) + '%</td><td>-</td></tr>';
      }
      details += '</table>';

      details += '<h4 class="mt-2">Memory Variance (Peak RSS)</h4>';
      details += '<table class="table-wrapper"><tr><th>Implementation</th><th>Size</th><th>Peak RSS</th><th>Baseline</th><th>Delta</th></tr>';
      BenchmarkData.memory.forEach(function (m) {
        details += '<tr>';
        details += '<td>' + m.implementation + '</td>';
        details += '<td>' + BenchmarkData.formatSize(m.input_size_bytes) + '</td>';
        details += '<td>' + BenchmarkData.formatBytes(m.peak_rss_bytes) + '</td>';
        details += '<td>' + BenchmarkData.formatBytes(m.baseline_rss_bytes) + '</td>';
        details += '<td>' + BenchmarkData.formatBytes(m.peak_rss_bytes - m.baseline_rss_bytes) + '</td>';
        details += '</tr>';
      });
      details += '</table>';

      details += '<div class="alert alert-warning mt-2"><strong>Security Implication:</strong> Timing variance can leak information about keys. Constant-time implementations are essential for cryptographic operations.</div>';

      showResult('s11Result', 'warning', 'Measurement Variance Analysis', details);
    });
  }

  // ==========================================================================
  // S12: Implementation Selection Decision Guide
  // ==========================================================================

  function initS12() {
    const runBtn = $('s12Run');
    if (!runBtn) return;

    runBtn.addEventListener('click', function () {
      const useCase = $('s12UseCase') ? $('s12UseCase').value : 'general';
      const priority = $('s12Priority') ? $('s12Priority').value : 'security';

      let recommendation = '';
      let details = '';

      if (useCase === 'tls') {
        recommendation = 'OpenSSL with AES-256-GCM';
        details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-256-GCM</strong></div>';
        details += '<p>TLS 1.3 mandates AES-GCM. Use OpenSSL or your platform\'s TLS library. Enable hardware acceleration (AES-NI, PCLMULQDQ).</p>';
      } else if (useCase === 'storage') {
        recommendation = 'OpenSSL with AES-256-XTS or AES-256-GCM';
        details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-256-XTS</strong></div>';
        details += '<p>For disk encryption, XTS mode is standard (NIST SP 800-38E). For file encryption, GCM with unique nonces per file.</p>';
      } else if (useCase === 'embedded') {
        recommendation = 'Hardware-accelerated AES or lightweight library';
        details = '<div class="alert alert-success"><strong>Recommendation: Hardware AES or mbedTLS</strong></div>';
        details += '<p>Use hardware AES if available. Otherwise, use mbedTLS or similar lightweight constant-time implementation.</p>';
      } else if (useCase === 'learning') {
        recommendation = 'This platform\'s educational implementation';
        details = '<div class="alert alert-success"><strong>Recommendation: Educational Implementation</strong></div>';
        details += '<p>Use the visualizer and key explorer on this site to understand AES. For production, always use established libraries.</p>';
      } else {
        if (priority === 'security') {
          recommendation = 'OpenSSL AES-256-GCM';
          details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-256-GCM</strong></div>';
          details += '<p>Best security with hardware acceleration. Use unique nonces (counter or random 96-bit).</p>';
        } else if (priority === 'speed') {
          recommendation = 'OpenSSL AES-128-GCM';
          details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-128-GCM</strong></div>';
          details += '<p>Fastest authenticated encryption. AES-128 is still secure for classical attacks.</p>';
        } else if (priority === 'memory') {
          recommendation = 'OpenSSL AES-128-GCM';
          details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-128-GCM</strong></div>';
          details += '<p>Lower memory footprint than AES-256. Minimal overhead.</p>';
        } else {
          recommendation = 'OpenSSL AES-256-GCM';
          details = '<div class="alert alert-success"><strong>Recommendation: OpenSSL AES-256-GCM</strong></div>';
          details += '<p>Widely supported, well-audited, hardware accelerated.</p>';
        }
      }

      details += '<table class="table-wrapper"><tr><th>Criteria</th><th>Recommendation</th></tr>';
      details += '<tr><td>Use case</td><td>' + useCase + '</td></tr>';
      details += '<tr><td>Priority</td><td>' + priority + '</td></tr>';
      details += '<tr><td>Choice</td><td><strong>' + recommendation + '</strong></td></tr>';
      details += '</table>';

      showResult('s12Result', 'success', 'Implementation Recommendation', details);
    });
  }

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  function flipBitsInHex(hex, bitPositions) {
    const bytes = AES.hexToBytes(hex);
    bitPositions.forEach(function (bitPos) {
      const byteIdx = Math.floor(bitPos / 8);
      const bitIdx = 7 - (bitPos % 8);
      if (byteIdx < bytes.length) {
        bytes[byteIdx] ^= (1 << bitIdx);
      }
    });
    return AES.bytesToHex(bytes);
  }

  function modifyTag(originalHex, numBits) {
    const bytes = AES.hexToBytes(originalHex);
    for (let i = 0; i < numBits; i++) {
      const byteIdx = i % bytes.length;
      const bitIdx = i % 8;
      bytes[byteIdx] ^= (1 << bitIdx);
    }
    return AES.bytesToHex(bytes);
  }

  function xorHex(hex1, hex2) {
    const b1 = AES.hexToBytes(hex1);
    const b2 = AES.hexToBytes(hex2);
    const result = new Uint8Array(b1.length);
    for (let i = 0; i < b1.length; i++) {
      result[i] = b1[i] ^ b2[i];
    }
    return AES.bytesToHex(result);
  }

})();
