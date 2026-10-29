/**
 * Service Worker registration (external so CSP needs no 'unsafe-inline').
 */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
