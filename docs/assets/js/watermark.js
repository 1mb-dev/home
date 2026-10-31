/**
 * Watermark drift
 * The numeral shifts a few pixels against the pointer and settles home when it leaves.
 */

(function () {
  'use strict';

  const host = document.querySelector('.hero, .page-work main, .page-404');
  if (!host || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const MAX_SHIFT = 8; // px either side of centre
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let x = 0;
  let y = 0;

  // Set on the host, not :root: the ::before inherits it, and nothing else restyles.
  function drift(dx, dy) {
    host.style.setProperty('--drift-x', `${dx}px`);
    host.style.setProperty('--drift-y', `${dy}px`);
  }

  document.addEventListener(
    'pointermove',
    (e) => {
      // A tap on a hybrid device also moves the pointer, then never leaves: mouse only.
      // Reduced motion is checked per move, not once: CSS drops the transition under it,
      // so a preference switched on mid-visit would turn the drift into a jump.
      if (e.pointerType !== 'mouse' || reduce.matches) return;
      x = e.clientX;
      y = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        drift(
          (0.5 - x / window.innerWidth) * 2 * MAX_SHIFT,
          (0.5 - y / window.innerHeight) * 2 * MAX_SHIFT
        );
      });
    },
    { passive: true }
  );

  // A frame still pending would undo the reset; the CSS transition eases it home.
  function home() {
    cancelAnimationFrame(frame);
    frame = 0;
    drift(0, 0);
  }

  document.documentElement.addEventListener('mouseleave', home);
  reduce.addEventListener('change', home);
})();
