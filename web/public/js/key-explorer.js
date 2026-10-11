/**
 * key-explorer.js — Key Expansion Explorer Logic
 *
 * ⚠️ Educational JavaScript implementation — NOT for production use.
 */

(function () {
  'use strict';

  const FIPS_KEY = '000102030405060708090a0b0c0d0e0f';

  let roundKeys = [];
  let currentStep = 0;
  let expansionSteps = [];

  function $(id) {
    return document.getElementById(id);
  }

  // ==========================================================================
  // Build expansion steps for visualization
  // ==========================================================================

  function buildExpansionSteps(key) {
    const steps = [];
    const Nk = 4;
    const Nr = 10;
    const totalWords = 4 * (Nr + 1);

    const w = new Array(totalWords);

    // First Nk words are the key itself
    for (let i = 0; i < Nk; i++) {
      w[i] = (key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3];
    }

    steps.push({
      wordIndex: 0,
      description: 'Initial key words W0-W3 loaded from cipher key',
      words: w.slice(0, 4),
      operation: 'Load Key'
    });

    // Expand remaining words
    for (let i = Nk; i < totalWords; i++) {
      let temp = w[i - 1];
      let op = 'W' + i + ' = W' + (i - Nk) + ' ⊕ W' + (i - 1);

      if (i % Nk === 0) {
        const rotated = ((temp << 8) | (temp >>> 24)) & 0xffffffff;
        const subbed = AES.subWord(rotated);
        const rcon = AES.RCON[i / Nk - 1];
        temp = subbed ^ (rcon << 24);
        op = 'W' + i + ' = W' + (i - Nk) + ' ⊕ SubWord(RotWord(W' + (i - 1) + ')) ⊕ Rcon[' + (i / Nk - 1) + ']';
      }

      w[i] = w[i - Nk] ^ temp;

      steps.push({
        wordIndex: i,
        description: op,
        words: w.slice(0, i + 1),
        operation: i % Nk === 0 ? 'g-function + XOR' : 'XOR'
      });
    }

    return steps;
  }

  // ==========================================================================
  // Render step
  // ==========================================================================

  function renderStep(stepIndex) {
    if (!expansionSteps.length || stepIndex < 0 || stepIndex >= expansionSteps.length) return;

    const step = expansionSteps[stepIndex];
    currentStep = stepIndex;

    const label = $('stepLabel');
    if (label) {
      label.textContent = 'Step ' + stepIndex + ' / ' + (expansionSteps.length - 1);
    }

    const content = $('stepContent');
    if (!content) return;

    let html = '<div class="card" style="background: var(--bg-tertiary);">';
    html += '<h4>' + step.operation + '</h4>';
    html += '<p>' + step.description + '</p>';

    // Show relevant words
    html += '<div class="hex-dump">';
    const startWord = Math.max(0, step.wordIndex - 3);
    for (let i = startWord; i <= step.wordIndex; i++) {
      const word = step.words[i];
      const hex = word.toString(16).padStart(8, '0');
      html += '<div><span class="offset">W' + i + ':</span> ';
      for (let b = 0; b < 4; b++) {
        const byte = (word >>> (24 - b * 8)) & 0xff;
        html += '<span class="byte">' + byte.toString(16).padStart(2, '0') + '</span>';
      }
      html += ' <span class="text-muted">(0x' + hex + ')</span></div>';
    }
    html += '</div>';

    // Show g-function details if applicable
    if (step.operation === 'g-function + XOR') {
      html += '<div class="mt-2"><h4>g-function breakdown</h4>';
      html += '<table class="table-wrapper"><tr><th>Step</th><th>Operation</th><th>Result</th></tr>';

      const prevWord = step.words[step.wordIndex - 1];
      const rotated = ((prevWord << 8) | (prevWord >>> 24)) & 0xffffffff;
      const subbed = AES.subWord(rotated);
      const rcon = AES.RCON[step.wordIndex / 4 - 1];

      html += '<tr><td>1</td><td>RotWord</td><td><code>0x' + rotated.toString(16).padStart(8, '0') + '</code></td></tr>';
      html += '<tr><td>2</td><td>SubWord</td><td><code>0x' + subbed.toString(16).padStart(8, '0') + '</code></td></tr>';
      html += '<tr><td>3</td><td>XOR Rcon[' + (step.wordIndex / 4 - 1) + ']</td><td><code>0x' + (subbed ^ (rcon << 24)).toString(16).padStart(8, '0') + '</code></td></tr>';
      html += '</table></div>';
    }

    html += '</div>';
    content.innerHTML = html;

    // Update button states
    const prevBtn = $('prevStepBtn');
    const nextBtn = $('nextStepBtn');
    if (prevBtn) prevBtn.disabled = stepIndex === 0;
    if (nextBtn) nextBtn.disabled = stepIndex === expansionSteps.length - 1;
  }

  // ==========================================================================
  // Render all round keys
  // ==========================================================================

  function renderRoundKeys() {
    const container = $('roundKeysList');
    if (!container || !roundKeys.length) return;

    let html = '<div class="grid-2">';
    for (let i = 0; i < roundKeys.length; i++) {
      html += '<div class="card" style="padding: 1rem; margin-bottom: 0.5rem;">';
      html += '<strong>Round Key ' + i + '</strong> ';
      if (i === 0) html += '<span class="badge badge-blue">Initial (W0-W3)</span>';
      if (i === roundKeys.length - 1) html += '<span class="badge badge-green">Final (W40-W43)</span>';
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
  // Render Rcon table
  // ==========================================================================

  function renderRconTable() {
    const tbody = $('rconTable');
    if (!tbody) return;

    let html = '';
    for (let i = 0; i < 10; i++) {
      const rcon = AES.RCON[i];
      html += '<tr>';
      html += '<td>Round ' + (i + 1) + '</td>';
      html += '<td><code>0x' + rcon.toString(16).padStart(2, '0') + '</code></td>';
      html += '<td><code>' + rcon.toString(2).padStart(8, '0') + '</code></td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }

  // ==========================================================================
  // Expand key
  // ==========================================================================

  function expandKey() {
    const keyHex = $('keyInput').value.trim();

    if (keyHex.length !== 32) {
      alert('Please enter 32 hex characters (16 bytes) for the key.');
      return;
    }

    try {
      const key = AES.hexToBytes(keyHex);
      roundKeys = AES.keyExpansion128(key);
      expansionSteps = buildExpansionSteps(key);

      // Show sections
      $('scheduleSection').style.display = '';
      $('stepSection').style.display = '';
      $('roundKeysSection').style.display = '';

      // Render first step
      renderStep(0);

      // Render all round keys
      renderRoundKeys();

    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  // ==========================================================================
  // Initialize
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', function () {
    // Expand button
    const expandBtn = $('expandBtn');
    if (expandBtn) {
      expandBtn.addEventListener('click', expandKey);
    }

    // Load FIPS vector button
    const loadBtn = $('loadVectorBtn');
    if (loadBtn) {
      loadBtn.addEventListener('click', function () {
        $('keyInput').value = FIPS_KEY;
      });
    }

    // Step navigation
    const prevBtn = $('prevStepBtn');
    const nextBtn = $('nextStepBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { renderStep(currentStep - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { renderStep(currentStep + 1); });

    // Render Rcon table
    renderRconTable();
  });

})();
