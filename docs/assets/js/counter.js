/**
 * 1mb Counter
 * Anonymous community counter — no identity, just presence.
 */

(function () {
  'use strict';

  const API_URL = 'https://1mb-counter.vmx-builds.workers.dev';

  const counter = document.getElementById('counter');
  const countEl = document.getElementById('count');
  const button = document.getElementById('count-btn');

  if (!counter || !countEl || !button) return;

  // Check if user already voted (client-side memory)
  const hasVotedLocally = localStorage.getItem('1mb_voted') === 'true';
  let isErrorState = false;

  // Format count with proper grammar
  function formatCount(count, today) {
    if (count === 0) return 'none yet';
    let text = count === 1 ? '1 other' : count.toLocaleString() + ' others';
    if (today > 0) {
      text += ' \u2014 ' + today + ' today';
    }
    return text;
  }

  // Show count with fade-in animation
  function showCount(count, today) {
    countEl.classList.remove('count-loading');
    countEl.textContent = formatCount(count, today);
    countEl.classList.add('count-loaded');
  }

  // Show error state
  function showError() {
    countEl.classList.remove('count-loading');
    countEl.textContent = '—';
  }

  // Fetch current count
  async function fetchCount() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      showCount(data.count, data.today);
    } catch (_e) {
      showError();
    }
  }

  // Handle error state with retry
  function setErrorState() {
    isErrorState = true;
    button.textContent = 'try again';
    button.disabled = false;
    button.classList.add('error');
  }

  // Clear error state
  function clearErrorState() {
    isErrorState = false;
    button.classList.remove('error');
  }

  // Submit vote
  async function vote() {
    if (hasVotedLocally || (button.disabled && !isErrorState)) return;

    // Clear error state if retrying
    if (isErrorState) {
      clearErrorState();
    }

    button.disabled = true;
    button.textContent = '...';

    try {
      const res = await fetch(API_URL, { method: 'POST' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();

      showCount(data.count, data.today);
      markAsVoted();
    } catch (_e) {
      setErrorState();
    }
  }

  function markAsVoted() {
    localStorage.setItem('1mb_voted', 'true');
    button.textContent = "you're in";
    button.disabled = true;
    button.classList.add('voted');
    button.setAttribute('aria-pressed', 'true');
  }

  // Init
  if (hasVotedLocally) {
    button.textContent = "you're in";
    button.disabled = true;
    button.classList.add('voted');
    button.setAttribute('aria-pressed', 'true');
  } else {
    button.setAttribute('aria-pressed', 'false');
  }

  button.addEventListener('click', vote);
  fetchCount();
})();
