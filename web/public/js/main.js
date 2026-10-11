/**
 * main.js — Shared utilities: theme toggle, navigation, helpers
 */

(function (global) {
  'use strict';

  // ==========================================================================
  // Theme Management
  // ==========================================================================

  function getStoredTheme() {
    try {
      return localStorage.getItem('aes-theme') || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('aes-theme', theme);
    } catch (e) { /* ignore */ }
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Initialize theme on page load
  document.addEventListener('DOMContentLoaded', function () {
    setTheme(getStoredTheme());
  });

  // ==========================================================================
  // Navigation Active State
  // ==========================================================================

  function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === path) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', setActiveNav);

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        func.apply(context, args);
      }, wait);
    };
  }

  function formatHex(bytes) {
    return Array.from(bytes).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join(' ');
  }

  function formatHexCompact(bytes) {
    return Array.from(bytes).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  global.toggleTheme = toggleTheme;
  global.debounce = debounce;
  global.formatHex = formatHex;
  global.formatHexCompact = formatHexCompact;

})(typeof window !== 'undefined' ? window : globalThis);
