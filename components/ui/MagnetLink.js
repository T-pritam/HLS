'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { initGsap, reducedMotion } from '@/lib/motion';

const REACH = 100; // px around the button where the pull starts
const PULL = 10; // the button's furthest move, px
const DEPTH = 4; // the label's extra move on top, px

/*
 * A link that leans toward the pointer. Inside REACH it follows the pointer
 * up to PULL px, its label a little further for depth; outside, it springs
 * back. Only transform animates. Touch screens and reduced motion get the
 * plain link.
 */
export default function MagnetLink({ href, className = '', children, ...rest }) {
  const link = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const gsap = initGsap();
    const el = link.current;
    const inner = label.current;
    const opts = { duration: 0.4, ease: 'power3.out' };
    const x = gsap.quickTo(el, 'x', opts);
    const y = gsap.quickTo(el, 'y', opts);
    const lx = gsap.quickTo(inner, 'x', opts);
    const ly = gsap.quickTo(inner, 'y', opts);
    let pulled = false;

    const release = () => {
      if (!pulled) return;
      pulled = false;
      gsap.to([el, inner], { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: true });
    };

    const move = (e) => {
      // Measure the resting box: the current pull is part of the rect.
      const r = el.getBoundingClientRect();
      const left = r.left - gsap.getProperty(el, 'x');
      const top = r.top - gsap.getProperty(el, 'y');
      const dx = e.clientX - (left + r.width / 2);
      const dy = e.clientY - (top + r.height / 2);
      const rx = r.width / 2 + REACH;
      const ry = r.height / 2 + REACH;
      if (Math.abs(dx) > rx || Math.abs(dy) > ry) {
        release();
        return;
      }
      pulled = true;
      const fx = dx / rx;
      const fy = dy / ry;
      x(fx * PULL);
      y(fy * PULL);
      lx(fx * DEPTH);
      ly(fy * DEPTH);
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', release);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', release);
      gsap.killTweensOf([el, inner]);
      gsap.set([el, inner], { clearProps: 'transform' });
    };
  }, []);

  return (
    <a
      ref={link}
      href={href}
      className={cn('focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-hls-signal', className)}
      {...rest}
    >
      <span ref={label} className="inline-flex items-center gap-3">
        {children}
      </span>
    </a>
  );
}
