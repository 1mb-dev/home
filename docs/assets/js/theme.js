/**
 * Theme Toggle
 * Handles dark/light mode switching with system preference fallback.
 */

(function () {
  'use strict';

  const STORAGE_KEY = '1mb_theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  // Storage can throw (private mode, blocked site data); a throw must not take the toggle down.
  function saved() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_e) {
      return null;
    }
  }

  function systemTheme() {
    return media.matches ? 'dark' : 'light';
  }

  // Always set data-theme: the icon CSS keys off it. Only an explicit toggle persists.
  function setTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_e) {
      // Not persisted; the choice still holds for this page.
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || systemTheme();
    setTheme(current === 'dark' ? 'light' : 'dark', true);
  }

  setTheme(saved() || systemTheme(), false);

  // Follow the system until the reader makes a choice.
  media.addEventListener('change', () => {
    if (!saved()) setTheme(systemTheme(), false);
  });

  // The toggle ships hidden so it is absent, not dead, without JS.
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute(
        'aria-pressed',
        String(document.documentElement.dataset.theme === 'dark')
      );
      toggle.hidden = false;
      toggle.addEventListener('click', toggleTheme);
    }
  });
})();
