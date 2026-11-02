/**
 * Theme Toggle
 * Handles dark/light mode switching with system preference fallback.
 */

(function () {
  'use strict';

  // Not 1mb_theme: the February site wrote that on every load, so it cannot tell a choice from a default.
  const STORAGE_KEY = '1mb_theme_choice';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen = null;

  // Storage can throw (private mode, blocked site data); a throw must not take the toggle down.
  function saved() {
    if (chosen) return chosen;
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_e) {
      return null;
    }
  }

  function systemTheme() {
    return media.matches ? 'dark' : 'light';
  }

  // Only an explicit toggle persists. The toggle names the theme a tap turns on; in the head it
  // does not exist yet, so the parsed page sets it again below.
  function setTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const other = theme === 'dark' ? 'light' : 'dark';
      toggle.textContent = other;
      toggle.setAttribute('aria-label', `${other} theme`);
    }
    if (!persist) return;
    chosen = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_e) {
      // Not persisted; the choice still holds for this page.
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
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
      setTheme(document.documentElement.dataset.theme, false);
      // A page cached before the wrap existed hides the button itself.
      (document.getElementById('theme-wrap') || toggle).hidden = false;
      toggle.addEventListener('click', toggleTheme);
    }
  });
})();
