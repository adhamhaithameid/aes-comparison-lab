/**
 * quiz.js — interactive AES knowledge quiz
 *
 * Instant feedback, time bonus, streak multiplier, keyboard shortcuts,
 * and a celebration that respects prefers-reduced-motion.
 *
 * ⚠️ Educational JavaScript implementation — NOT for production use.
 */

(function () {
  'use strict';

  // ==========================================================================
  // Question bank
  // ==========================================================================

  const QUESTIONS = [
    {
      category: 'AES',
      text: 'How many rounds does AES-128 perform?',
      options: ['8 rounds', '10 rounds', '12 rounds', '14 rounds'],
      answer: 1,
      explain: 'AES-128 uses 10 rounds. AES-192 uses 12 and AES-256 uses 14.'
    },
    {
      category: 'AES',
      text: 'What is the AES block size?',
      options: ['64 bits', '128 bits', '256 bits', 'Depends on key size'],
      answer: 1,
      explain: 'AES always operates on 128-bit blocks, regardless of whether the key is 128, 192, or 256 bits.'
    },
    {
      category: 'AES',
      text: 'Which of these is NOT one of the four AES round transformations?',
      options: ['SubBytes', 'ShiftRows', 'MixColumns', 'RotateWords'],
      answer: 3,
      explain: 'RotateWords is not part of AES. The four are SubBytes, ShiftRows, MixColumns, and AddRoundKey.'
    },
    {
      category: 'AES',
      text: 'What does the key expansion (key schedule) produce?',
      options: ['The ciphertext', 'Round keys for each round', 'The S-box', 'The IV'],
      answer: 1,
      explain: 'The key schedule expands the cipher key into a set of round keys — one per round plus the initial one.'
    },
    {
      category: 'Cryptography',
      text: 'What does ECB mode reveal about plaintext?',
      options: ['Nothing', 'Only the block count', 'Identical plaintext blocks produce identical ciphertext', 'The encryption key'],
      answer: 2,
      explain: 'ECB encrypts each block independently, so equal plaintext blocks yield equal ciphertext blocks — leaking patterns.'
    },
    {
      category: 'Cryptography',
      text: 'What does AES-GCM provide that AES-ECB does not?',
      options: ['Speed', 'Authentication (tamper detection)', 'Smaller blocks', 'Larger keys'],
      answer: 1,
      explain: 'GCM adds a 128-bit authentication tag, so any modification of the ciphertext is detected before plaintext is released.'
    },
    {
      category: 'Security',
      text: 'Why is nonce reuse dangerous in AES-GCM?',
      options: ['It slows encryption', 'It breaks confidentiality for both messages', 'It leaks the S-box', 'It has no effect'],
      answer: 1,
      explain: 'Reusing a GCM nonce under the same key leaks the XOR of the two plaintexts and can lead to tag forgery.'
    },
    {
      category: 'Security',
      text: 'The from-scratch AES in this project is safe to use for real data.',
      options: ['True', 'False'],
      answer: 1,
      explain: 'False. It is unauthenticated and not constant-time. Use a vetted library such as OpenSSL for real data.'
    },
    {
      category: 'Cryptography',
      text: 'How many test checks does the C++ test suite in this project run?',
      options: ['100', '500', '1,431', '10,000'],
      answer: 2,
      explain: '1,431 checks, all passing — FIPS 197 KATs, NIST CAVP vectors, round-trips, negative tests, and cross-validation.'
    },
    {
      category: 'AES',
      text: 'Rijndael, the cipher AES is based on, was designed by…',
      options: ['Rivest and Shamir', 'Daemen and Rijmen', 'Diffie and Hellman', 'Shannon'],
      answer: 1,
      explain: 'Joan Daemen and Vincent Rijmen designed Rijndael, which became AES after the NIST competition.'
    }
  ];

  // ==========================================================================
  // State
  // ==========================================================================

  const POINTS_BASE = 100;
  const TIME_BONUS_WINDOW = 10000;   // ms to earn a time bonus
  const STREAK_STEP = 0.25;          // each streak level adds 25%
  const BEST_KEY = 'aes-lab-best-score';

  let order = [];
  let index = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correct = 0;
  let startTime = 0;
  let timerId = null;
  let currentPoints = 0;
  let reducedMotion = false;

  // ==========================================================================
  // Helpers
  // ==========================================================================

  function $(id) { return document.getElementById(id); }

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fmtTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function getBest() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; }
    catch (e) { return 0; }
  }

  function setBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* ignore */ }
  }

  // ==========================================================================
  // Timer
  // ==========================================================================

  function startTimer() {
    startTime = Date.now();
    const el = $('qTimer');
    if (!el) return;
    timerId = setInterval(function () {
      el.textContent = fmtTime(Date.now() - startTime);
    }, 250);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function elapsed() { return Date.now() - startTime; }

  // ==========================================================================
  // Screen switching
  // ==========================================================================

  function show(screenId) {
    ['quizStart', 'quizPlay', 'quizResults'].forEach(function (id) {
      const el = $(id);
      if (!el) return;
      if (id === screenId) { el.hidden = false; }
      else { el.hidden = true; }
    });
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  function renderQuestion() {
    const q = QUESTIONS[order[index]];
    if (!q) return;

    $('qCurrent').textContent = String(index + 1);
    $('qTotal').textContent = String(QUESTIONS.length);
    $('qScore').textContent = String(score);
    $('qStreak').textContent = String(streak);
    $('qCategory').textContent = q.category;
    $('qPoints').textContent = POINTS_BASE + ' pts';
    $('qText').textContent = q.text;

    const progress = $('qProgress');
    if (progress) progress.setAttribute('aria-valuenow', String(index + 1));

    // Options
    const wrap = $('qOptions');
    wrap.innerHTML = '';
    wrap.setAttribute('aria-label', 'Answer options for question ' + (index + 1));
    q.options.forEach(function (opt, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', 'Option ' + (i + 1) + ': ' + opt);

      const key = document.createElement('span');
      key.className = 'quiz-option-key';
      key.textContent = String(i + 1);
      const label = document.createElement('span');
      label.className = 'quiz-option-label';
      label.textContent = opt;

      btn.appendChild(key);
      btn.appendChild(label);
      btn.addEventListener('click', function () { answer(i); });
      wrap.appendChild(btn);
    });

    // Reset feedback
    const fb = $('qFeedback');
    fb.hidden = true;
    fb.className = 'quiz-feedback';
    $('qFeedbackInner').textContent = '';
    $('nextBtn').hidden = true;

    // Focus the first option for keyboard users
    const first = wrap.querySelector('.quiz-option');
    if (first) first.focus();
  }

  // ==========================================================================
  // Answering
  // ==========================================================================

  function answer(i) {
    const q = QUESTIONS[order[index]];
    if (!q) return;
    if ($('qFeedback') && !$('qFeedback').hidden) return;  // already answered

    const options = $('qOptions').querySelectorAll('.quiz-option');
    const correctIdx = q.answer;
    const isCorrect = i === correctIdx;

    // Score
    const timeBonus = Math.max(0, Math.round(
      (TIME_BONUS_WINDOW - elapsed()) / TIME_BONUS_WINDOW * POINTS_BASE));
    const streakMult = 1 + streak * STREAK_STEP;

    if (isCorrect) {
      currentPoints = Math.round((POINTS_BASE + timeBonus) * streakMult);
      score += currentPoints;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      correct += 1;
    } else {
      currentPoints = 0;
      streak = 0;
    }

    // Mark options
    options.forEach(function (btn, idx) {
      btn.disabled = true;
      if (idx === correctIdx) btn.classList.add('correct');
      else if (idx === i) btn.classList.add('wrong');
      btn.setAttribute('aria-checked', idx === i ? 'true' : 'false');
    });

    // Feedback
    const fb = $('qFeedback');
    fb.hidden = false;
    fb.className = 'quiz-feedback ' + (isCorrect ? 'is-correct' : 'is-wrong');
    const inner = $('qFeedbackInner');
    inner.textContent = '';

    const verdict = document.createElement('strong');
    verdict.textContent = isCorrect ? 'Correct! ' : 'Not quite. ';
    inner.appendChild(verdict);

    const detail = document.createElement('span');
    detail.textContent = q.explain;
    inner.appendChild(detail);

    if (isCorrect && currentPoints > POINTS_BASE) {
      const bonus = document.createElement('span');
      bonus.className = 'quiz-bonus';
      bonus.textContent = '+' + currentPoints + (streak > 1 ? ' (streak x' + streak + ')' : '');
      inner.appendChild(bonus);
    }

    // HUD
    $('qScore').textContent = String(score);
    $('qStreak').textContent = String(streak);
    $('qCurrent').textContent = String(index + 1);

    const next = $('nextBtn');
    next.hidden = false;
    next.textContent = index === QUESTIONS.length - 1 ? 'See Results' : 'Next Question';
    next.focus();
  }

  // ==========================================================================
  // Results
  // ==========================================================================

  function finish() {
    stopTimer();
    const total = elapsed();

    $('finalScore').textContent = String(score);
    $('statCorrect').textContent = correct + '/' + QUESTIONS.length;
    $('statAccuracy').textContent = Math.round(correct / QUESTIONS.length * 100) + '%';
    $('statTime').textContent = fmtTime(total);
    $('statBestStreak').textContent = String(bestStreak);

    const prevBest = getBest();
    if (score > prevBest) {
      setBest(score);
      $('resultsMessage').textContent = score > 0
        ? 'New best score — nice work.'
        : 'Nice work.';
    } else {
      $('resultsMessage').textContent = 'Best score: ' + prevBest + '. Can you beat it?';
    }

    // Rating
    const ratio = correct / QUESTIONS.length;
    let title, icon;
    if (ratio === 1) { title = 'Perfect score'; icon = 'trophy'; }
    else if (ratio >= 0.8) { title = 'Excellent'; icon = 'star'; }
    else if (ratio >= 0.6) { title = 'Good job'; icon = 'check'; }
    else if (ratio >= 0.4) { title = 'Keep learning'; icon = 'book'; }
    else { title = 'Keep going'; icon = 'target'; }
    $('resultsTitle').textContent = title;

    const iconEl = $('resultsIcon');
    if (iconEl && window.Icon) {
      iconEl.textContent = '';
      Icon.mount(iconEl, icon);
      iconEl.style.color = 'var(--accent-primary)';
    } else if (iconEl) {
      iconEl.textContent = '';
    }

    // Badges
    const badges = [];
    if (ratio === 1) badges.push({ icon: 'trophy', label: 'Flawless' });
    if (bestStreak >= 5) badges.push({ icon: 'flame', label: 'On fire (x5 streak)' });
    else if (bestStreak >= 3) badges.push({ icon: 'bolt', label: 'Streak x3' });
    if (total < 60000 && correct >= 6) badges.push({ icon: 'bolt', label: 'Speed demon' });
    const badgeWrap = $('resultsBadges');
    badgeWrap.innerHTML = '';
    badges.forEach(function (b) {
      const chip = document.createElement('span');
      chip.className = 'badge badge-purple quiz-badge';
      if (window.Icon) {
        const holder = document.createElement('span');
        holder.style.marginRight = '0.35rem';
        chip.appendChild(holder);
        Icon.mount(holder, b.icon);
      }
      chip.appendChild(document.createTextNode(b.label));
      badgeWrap.appendChild(chip);
    });

    show('quizResults');
    celebrate(ratio);
  }

  /**
   * Celebration. Respects prefers-reduced-motion: when set, show a brief
   * highlight on the results card instead of particles.
   */
  function celebrate(ratio) {
    reducedMotion = prefersReducedMotion();
    if (reducedMotion) {
      const card = $('quizResults .card');
      if (card) {
        card.classList.add('quiz-results-flash');
        setTimeout(function () { card.classList.remove('quiz-results-flash'); }, 600);
      }
      return;
    }
    if (ratio < 0.4) return;   // no confetti for low scores

    const count = ratio === 1 ? 90 : ratio >= 0.8 ? 60 : 35;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    const origin = { x: 0.5, y: 0.6 };

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = (origin.x * 100) + '%';
      p.style.top = (origin.y * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 2 - 1).toFixed(3));
      p.style.setProperty('--dy', (-(Math.random() * 0.9 + 0.4)).toFixed(3));
      p.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0));
      p.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
      document.body.appendChild(p);
      (function (node) {
        setTimeout(function () { node.remove(); }, 2600);
      })(p);
    }
  }

  // ==========================================================================
  // Flow control
  // ==========================================================================

  function startQuiz() {
    order = shuffle(QUESTIONS.map(function (_, i) { return i; }));
    index = 0; score = 0; streak = 0; bestStreak = 0; correct = 0;
    show('quizPlay');
    renderQuestion();
    startTimer();
  }

  function nextQuestion() {
    index += 1;
    if (index >= QUESTIONS.length) { finish(); return; }
    renderQuestion();
  }

  // ==========================================================================
  // Init
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', function () {
    reducedMotion = prefersReducedMotion();

    const best = getBest();
    if (best > 0) {
      const line = $('bestScoreLine');
      if (line) line.hidden = false;
      $('bestScore').textContent = String(best);
    }

    $('startBtn').addEventListener('click', startQuiz);
    $('retryBtn').addEventListener('click', startQuiz);
    $('nextBtn').addEventListener('click', nextQuestion);

    document.addEventListener('keydown', function (e) {
      if ($('quizPlay').hidden) return;
      const fb = $('qFeedback');

      if (!fb.hidden && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        nextQuestion();
        return;
      }
      if (fb.hidden) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) {
          const q = QUESTIONS[order[index]];
          if (q && n <= q.options.length) answer(n - 1);
        }
      }
    });
  });

})();
