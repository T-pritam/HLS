'use client';

import { useEffect, useRef } from 'react';
import { reducedMotion } from '@/lib/motion';

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [data-cursor]';

/**
 * 8px Signal Blue dot on the pointer, 32px Platinum ring trailing behind it.
 * The ring scales up over links and buttons. Hidden on touch devices.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    if (reducedMotion()) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const d = dot.current;
    const r = ring.current;
    if (!d || !r) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let frame;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      wake();
      if (!visible) {
        visible = true;
        rx = mx;
        ry = my;
        d.style.opacity = '1';
        r.style.opacity = '0.45';
      }
    };

    const onOver = (e) => {
      targetScale = e.target.closest?.(INTERACTIVE) ? 1.7 : 1;
      wake();
    };

    const onLeave = () => {
      d.style.opacity = '0';
      r.style.opacity = '0';
      visible = false;
    };

    // The loop sleeps once the ring has caught up, and wakes on the next move.
    const tick = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      scale += (targetScale - scale) * 0.14;
      d.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale.toFixed(3)})`;
      const settled = Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1 && Math.abs(targetScale - scale) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    d.style.opacity = '0';
    r.style.opacity = '0';

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className="cursor-dot"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      />
      <div
        ref={ring}
        className="cursor-ring"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      />
    </>
  );
}
