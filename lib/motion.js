'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/** Register the plugins once, client side only. */
export function initGsap() {
  if (typeof window === 'undefined') return gsap;
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'expo.out' });
    registered = true;
  }
  return gsap;
}

export function reducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The pinned scenes play static: with reduced motion, or on a phone that
 * loaded sideways (static-story, set by the layout's head script, kept for
 * the visit so a rotation never tears a scene down mid-scroll).
 */
export function staticScenes() {
  if (typeof window === 'undefined') return false;
  return reducedMotion() || document.documentElement.classList.contains('static-story');
}

/**
 * A pinned scene's scroll length, as a ScrollTrigger `end`. Phones (under
 * 768px wide) get the shorter one: the same timeline over less scrolling.
 * A function, so every refresh (a rotation, a resize) picks again.
 */
export function pinLength(desktop, phone) {
  return () => `+=${window.innerWidth < 768 ? phone : desktop}%`;
}

/** Where every call to action points. Set NEXT_PUBLIC_LANDING_URL once the landing page is live. */
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || '#';

/**
 * Calls `fn` after the viewport settles at a new size. Height changes under
 * 120px are mobile toolbars showing and hiding, the svh stages ignore those.
 */
export function onResize(fn, delay = 220) {
  let w = window.innerWidth;
  let h = window.innerHeight;
  let t;
  const handler = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (nw === w && Math.abs(nh - h) < 120) return;
      w = nw;
      h = nh;
      fn();
    }, delay);
  };
  window.addEventListener('resize', handler);
  return () => {
    clearTimeout(t);
    window.removeEventListener('resize', handler);
  };
}

const firstInputQueue = [];
let inputSeen = false;
let inputListening = false;
const INPUTS = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'];

function flushFirstInput() {
  if (inputSeen) return;
  inputSeen = true;
  INPUTS.forEach((type) => window.removeEventListener(type, flushFirstInput, true));
  firstInputQueue.sort((a, b) => b.priority - a.priority);
  // The scene just below the fold builds now, before the first scroll frame
  // lands. The rest follow one per task, so no single task blocks for long.
  const next = () => {
    const job = firstInputQueue.shift();
    if (!job) {
      refreshSoon();
      return;
    }
    job.fn();
    setTimeout(next, 0);
  };
  next();
}

/**
 * Builds the queued scenes now instead of on the first input. Pages call it
 * when the browser is idle, so the first scroll doesn't pay for them.
 */
export function warmFirstInput() {
  if (inputListening) flushFirstInput();
}

/**
 * Runs `fn` on the visitor's first wheel, touch, key or scroll, in order of
 * `priority` (the same number that orders the ScrollTrigger refresh, higher
 * first). Scenes below the fold cost a lot to build and nobody sees them
 * before scrolling, so the first paint does not pay for them.
 * Returns a cancel function.
 */
export function afterFirstInput(priority, fn) {
  if (inputSeen) {
    fn();
    refreshSoon();
    return () => {};
  }
  const job = { priority, fn };
  firstInputQueue.push(job);
  if (!inputListening) {
    inputListening = true;
    INPUTS.forEach((type) =>
      window.addEventListener(type, flushFirstInput, { capture: true, passive: true })
    );
  }
  return () => {
    const i = firstInputQueue.indexOf(job);
    if (i >= 0) firstInputQueue.splice(i, 1);
  };
}

let refreshFrame;

/**
 * A scene that rebuilds after a resize re-creates its pin out of page order.
 * Sorting by refreshPriority puts it back before the scenes below measure.
 */
export function refreshSoon() {
  cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}
