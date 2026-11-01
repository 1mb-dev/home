/**
 * 1mb Counter
 * Anonymous community counter. No identity, just presence.
 */

(function () {
  'use strict';

  const API_URL = 'https://counter.1mb.dev';

  const counter = document.getElementById('counter');
  const countEl = document.getElementById('count');
  const button = document.getElementById('count-btn');

  if (!counter || !countEl || !button) return;

  let voted = false;
  try {
    voted = localStorage.getItem('1mb_voted') === 'true';
  } catch (_e) {
    // no storage: the server's per-IP limit still applies
  }
  let busy = false;
  let count = null;

  function proof() {
    if (voted) {
      const others = count === null ? 0 : count - 1;
      if (others < 1) return "you're in";
      return `you're in with ${others.toLocaleString()} ${others === 1 ? 'other' : 'others'}`;
    }
    if (!count) return '';
    return count.toLocaleString() + ' in';
  }

  function render() {
    counter.classList.toggle('in', voted);
    countEl.textContent = proof();
  }

  // A GET that lands after the POST holds the older number.
  function take(n) {
    count = count === null ? n : Math.max(count, n);
    render();
  }

  // One write per load: the proof is a live region, and each write is announced.
  async function fetchCount() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(res.status);
      take((await res.json()).count);
    } catch (_e) {
      render();
    }
  }

  function remember() {
    try {
      localStorage.setItem('1mb_voted', 'true');
    } catch (_e) {
      // not remembered locally; the server still counted it
    }
  }

  // Never button.disabled: it drops focus to body, so Enter cannot reach `try again`.
  async function vote() {
    if (voted || busy) return;
    busy = true;
    button.classList.remove('error');
    button.textContent = '...';
    button.setAttribute('aria-label', 'counting');

    try {
      const res = await fetch(API_URL, { method: 'POST' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      remember();
      if (document.activeElement === button) counter.focus({ preventScroll: true });
      voted = true;
      take(data.count);
    } catch (_e) {
      button.removeAttribute('aria-label');
      button.textContent = 'try again';
      button.classList.add('error');
    }
    busy = false;
  }

  counter.classList.toggle('in', voted);
  button.addEventListener('click', vote);
  fetchCount();
})();
