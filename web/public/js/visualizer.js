/**
 * visualizer.js — AES-128 Round Visualizer Logic
 *
 * ⚠️ Educational JavaScript implementation — NOT for production use.
 */

(function () {
  'use strict';

  // FIPS 197 Appendix B test vector
  const FIPS_PLAINTEXT = '00112233445566778899aabbccddeeff';
  const FIPS_KEY = '000102030405060708090a0b0c0d0e0f';
  const FIPS_CIPHERTEXT = '69c4e0d86a7b0430d8cdb78070b4c55a';

  let currentTrace = [];
  let currentStep = 0;
  let roundKeys = [];
  let autoPlayInterval = null;

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  function $(id) {
    return document.getElementById(id);
  }

  // ==========================================================================
  // State Matrix Rendering
  // ==========================================================================

  function renderStateMatrix(state, highlightIndices) {
    const container = $('stateMatrix');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = state[i].toString(16).padStart(2, '0');
      cell.setAttribute('aria-label', 'Byte ' + i + ': 0x' + state[i].toString(16).padStart(2, '0'));

      if (highlightIndices && highlightIndices.includes(i)) {
        cell.classList.add('highlight');
      }

      container.appendChild(cell);
    }
  }

  function renderHexDump(state, label) {
    const container = $('stateHex');
    if (!container) return;

    let html = '';
    if (label) {
      html += '<strong>' + label + '</strong><br>';
    }
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) html += ' ';
      html += '<span class="byte">' + state[i].toString(16).padStart(2, '0') + '</span>';
    }
    container.innerHTML = html;
  }

  function renderRoundKey(roundKey, label) {
    const container = $('roundKeyDisplay');
    if (!container) return;

    let html = '';
    if (label) {
      html += '<strong>' + label + '</strong><br>';
    }
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) html += ' ';
      html += roundKey[i].toString(16).padStart(2, '0');
    }
    container.innerHTML = html;
  }

  // ==========================================================================
  // Step Indicator
  // ==========================================================================

  function renderStepIndicator(current, total) {
    const container = $('stepIndicator');
    if (!container) return;

    container.innerHTML = '';
    container.setAttribute('aria-valuenow', current);
    container.setAttribute('aria-valuemax', total);

    for (let i = 0; i <= total; i++) {
      const dot = document.createElement('span');
      dot.className = 'step-dot';
      if (i < current) dot.classList.add('completed');
      if (i === current) dot.classList.add('active');
      dot.setAttribute('aria-label', 'Round ' + i + (i < current ? ' completed' : i === current ? ' current' : ''));
      container.appendChild(dot);
    }

    const fill = $('progressFill');
    if (fill) {
      fill.style.width = (current / total * 100) + '%';
    }
  }

  // ==========================================================================
  // Transformation Details
  // ==========================================================================

  function renderTransformDetails(step) {
    const container = $('transformDetails');
    if (!container) return;

    const state = step.state;
    const op = step.operation;

    let html = '<div class="grid-2">';
    html += '<div><h4>Operation: ' + op + '</h4>';
    html += '<p>' + step.description + '</p></div>';
    html += '<div><h4>State (hex)</h4><div class="hex-dump">';

    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) html += ' ';
      html += state[i].toString(16).padStart(2, '0');
    }
    html += '</div></div></div>';

    // Add operation-specific details
    if (op === 'SubBytes') {
      html += '<div class="mt-2"><h4>S-Box Substitution Examples</h4>';
      html += '<table class="table-wrapper"><tr><th>Input</th><th>S-Box</th><th>Output</th></tr>';
      for (let i = 0; i < Math.min(4, 16); i++) {
        html += '<tr><td><code>0x' + state[i].toString(16).padStart(2, '0') + '</code></td>';
        html += '<td>→</td>';
        html += '<td><code>0x' + AES.SBOX[state[i]].toString(16).padStart(2, '0') + '</code></td></tr>';
      }
      html += '</table></div>';
    } else if (op === 'ShiftRows') {
      html += '<div class="mt-2"><h4>Row Shifts</h4>';
      html += '<p>Row 0: no shift | Row 1: ← 1 byte | Row 2: ← 2 bytes | Row 3: ← 3 bytes</p></div>';
    } else if (op === 'MixColumns') {
      html += '<div class="mt-2"><h4>GF(2^8) Matrix</h4>';
      html += '<pre>[02 03 01 01]\n[01 02 03 01]\n[01 01 02 03]\n[03 01 01 02]</pre></div>';
    } else if (op === 'AddRoundKey') {
      html += '<div class="mt-2"><h4>XOR Operation</h4>';
      html += '<p>State ⊕ Round Key = New State</p></div>';
    }

    container.innerHTML = html;
  }

  // ==========================================================================
  // Render Step
  // ==========================================================================

  function renderStep(stepIndex) {
    if (!currentTrace.length || stepIndex < 0 || stepIndex >= currentTrace.length) return;

    const step = currentTrace[stepIndex];
    currentStep = stepIndex;

    // Update round badge
    const badge = $('roundBadge');
    if (badge) {
      badge.textContent = 'Round ' + step.round;
    }

    // Update operation description
    const desc = $('operationDesc');
    if (desc) {
      desc.textContent = step.operation + ' — ' + step.description;
    }

    // Render state matrix
    renderStateMatrix(step.state);

    // Render hex dump
    renderHexDump(step.state, 'State:');

    // Render round key if available
    if (step.roundKey) {
      renderRoundKey(step.roundKey, 'Round Key ' + step.round + ':');
      const rkHex = $('roundKeyHex');
      if (rkHex) {
        let html = '';
        for (let i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) html += ' ';
          html += '<span class="byte">' + step.roundKey[i].toString(16).padStart(2, '0') + '</span>';
        }
        rkHex.innerHTML = html;
      }
    }

    // Update explanation
    const expl = $('explanationText');
    if (expl) {
      expl.textContent = step.description;
    }

    // Render transformation details
    renderTransformDetails(step);

    // Update step indicator
    renderStepIndicator(step.round, 10);

    // Update button states
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');
    if (prevBtn) prevBtn.disabled = stepIndex === 0;
    if (nextBtn) nextBtn.disabled = stepIndex === currentTrace.length - 1;
  }

  // ==========================================================================
  // All Round Keys Display
  // ==========================================================================

  function renderAllRoundKeys() {
    const container = $('allRoundKeys');
    if (!container || !roundKeys.length) return;

    let html = '<div class="grid-2">';
    for (let i = 0; i < roundKeys.length; i++) {
      html += '<div class="card" style="padding: 1rem; margin-bottom: 0.5rem;">';
      html += '<strong>Round Key ' + i + '</strong> ';
      if (i === 0) html += '<span class="badge badge-blue">Initial</span>';
      if (i === roundKeys.length - 1) html += '<span class="badge badge-green">Final</span>';
      html += '<div class="hex-dump" style="margin-top: 0.5rem;">';
      for (let j = 0; j < 16; j++) {
        if (j > 0 && j % 4 === 0) html += ' ';
        html += roundKeys[i][j].toString(16).padStart(2, '0');
      }
      html += '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // ==========================================================================
  // Encrypt and Visualize
  // ==========================================================================

  function encryptAndVisualize() {
    const plaintextHex = $('plaintextInput').value.trim();
    const keyHex = $('keyInput').value.trim();

    if (plaintextHex.length !== 32 || keyHex.length !== 32) {
      alert('Please enter 32 hex characters (16 bytes) for both plaintext and key.');
      return;
    }

    try {
      const plaintext = AES.hexToBytes(plaintextHex);
      const key = AES.hexToBytes(keyHex);

      roundKeys = AES.keyExpansion128(key);
      const result = AES.encryptWithTrace128(plaintext, roundKeys);
      currentTrace = result.trace;
      currentStep = 0;

      // Show sections
      $('roundSection').style.display = '';
      $('vizSection').style.display = '';
      $('allKeysSection').style.display = '';
      $('ciphertextSection').style.display = '';

      // Render first step
      renderStep(0);

      // Render all round keys
      renderAllRoundKeys();

      // Show ciphertext
      const ctOutput = $('ciphertextOutput');
      if (ctOutput) {
        let html = '';
        for (let i = 0; i < 16; i++) {
          if (i > 0 && i % 4 === 0) html += ' ';
          html += '<span class="byte">' + result.ciphertext[i].toString(16).padStart(2, '0') + '</span>';
        }
        ctOutput.innerHTML = html;
      }

      // Verify against FIPS vector
      const actualHex = AES.bytesToHex(result.ciphertext);
      if (actualHex === FIPS_CIPHERTEXT) {
        const alertDiv = document.querySelector('#ciphertextSection .alert-success');
        if (alertDiv) {
          alertDiv.innerHTML = '<span aria-hidden="true">✅</span><div><strong>Correct!</strong> Output matches FIPS 197 Appendix B: <code>' + FIPS_CIPHERTEXT + '</code></div>';
        }
      } else {
        const alertDiv = document.querySelector('#ciphertextSection .alert-success');
        if (alertDiv) {
          alertDiv.className = 'alert alert-danger mt-2';
          alertDiv.innerHTML = '<span aria-hidden="true">❌</span><div><strong>Mismatch!</strong> Expected: <code>' + FIPS_CIPHERTEXT + '</code> Got: <code>' + actualHex + '</code></div>';
        }
      }

    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // ==========================================================================
  // Auto Play
  // ==========================================================================

  function toggleAutoPlay() {
    const btn = $('autoBtn');
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
      if (btn) btn.textContent = '▶ Auto Play';
    } else {
      if (btn) btn.textContent = '⏸ Pause';
      autoPlayInterval = setInterval(function () {
        if (currentStep < currentTrace.length - 1) {
          renderStep(currentStep + 1);
        } else {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
          if (btn) btn.textContent = '▶ Auto Play';
        }
      }, 1500);
    }
  }

  // ==========================================================================
  // Initialize
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', function () {
    // Load FIPS vector button
    const loadBtn = $('loadVectorBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', function () {
        $('plaintextInput').value = FIPS_PLAINTEXT;
        $('keyInput').value = FIPS_KEY;
      });
    }

    // Encrypt button
    const encryptBtn = $('encryptBtn');
    if (encryptBtn) {
      encryptBtn.addEventListener('click', encryptAndVisualize);
    }

    // Reset button
    const resetBtn = $('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        $('plaintextInput').value = FIPS_PLAINTEXT;
        $('keyInput').value = FIPS_KEY;
        $('roundSection').style.display = 'none';
        $('vizSection').style.display = 'none';
        $('allKeysSection').style.display = 'none';
        $('ciphertextSection').style.display = 'none';
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
        }
      });
    }

    // Navigation buttons
    const firstBtn = $('firstBtn');
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');
    const lastBtn = $('lastBtn');
    const autoBtn = $('autoBtn');

    if (firstBtn) firstBtn.addEventListener('click', function () { renderStep(0); });
    if (prevBtn) prevBtn.addEventListener('click', function () { renderStep(currentStep - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { renderStep(currentStep + 1); });
    if (lastBtn) lastBtn.addEventListener('click', function () { renderStep(currentTrace.length - 1); });
    if (autoBtn) autoBtn.addEventListener('click', toggleAutoPlay);

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (!$('vizSection') || $('vizSection').style.display === 'none') return;

      if (e.key === 'ArrowLeft' && currentStep > 0) {
        renderStep(currentStep - 1);
      } else if (e.key === 'ArrowRight' && currentStep < currentTrace.length - 1) {
        renderStep(currentStep + 1);
      }
    });
  });

})();
