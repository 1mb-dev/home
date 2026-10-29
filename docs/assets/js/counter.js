/**
 * 1mb Counter
 * Anonymous community counter. No identity, just presence.
 */

(function () {
  'use strict';

  const API_URL = 'https://1mb-counter.vmx-builds.workers.dev';

  const counter = document.getElementById('counter');
  const countEl = document.getElementById('count');
  const button = document.getElementById('count-btn');
  const proof = countEl && countEl.closest('.counter-proof');

  if (!counter || !countEl || !button || !proof) return;

  // Check if user already voted (client-side memory). Storage can throw; treat that as not voted.
  let hasVotedLocally = false;
  try {
    hasVotedLocally = localStorage.getItem('1mb_voted') === 'true';
  } catch (_e) {
    // no storage: the server's per-IP limit still applies
  }
  let isErrorState = false;

  function formatCount(count, today) {
    if (count === 0) return 'no one yet';
    let text = count.toLocaleString() + ' in';
    if (today > 0) {
      text += ', ' + today.toLocaleString() + ' today';
    }
    return text;
  }

  // The proof line stays hidden until there is a count to show; on failure it never appears.
  function showCount(count, today) {
    countEl.textContent = formatCount(count, today);
    proof.hidden = false;
  }

  // Fetch current count
  async function fetchCount() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      showCount(data.count, data.today);
    } catch (_e) {
      // Count unavailable: say nothing rather than show a placeholder.
    }
  }

  // Handle error state with retry
  function setErrorState() {
    isErrorState = true;
    button.removeAttribute('aria-label');
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
    button.setAttribute('aria-label', 'counting');

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
    try {
      localStorage.setItem('1mb_voted', 'true');
    } catch (_e) {
      // not remembered locally; the server still counted it
    }
    button.removeAttribute('aria-label');
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
