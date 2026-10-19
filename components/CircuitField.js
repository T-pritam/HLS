'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { buildCircuit } from '@/lib/circuit';
import { afterFirstInput, initGsap, reducedMotion } from '@/lib/motion';

/**
 * Network of nodes joined by orthogonal Signal Blue traces. Lines draw
 * themselves in with stroke-dashoffset, nodes settle in behind them.
 *
 * mode "load"    draws on mount
 * mode "scroll"  draws when the element reaches the viewport
 */
export default function CircuitField({
  seed = 20260804,
  cols = 6,
  rows = 5,
  width = 1600,
  height = 900,
  nodeRadius = 3,
  duration = 2,
  mode = 'load',
  active = false,
  delay = 0,
  className = '',
  preserveAspectRatio = 'xMidYMid slice',
  right,
  down,
  diag,
}) {
  const svg = useRef(null);
  const timeline = useRef(null);
  const circuit = useMemo(
    () => buildCircuit({ width, height, cols, rows, seed, right, down, diag }),
    [width, height, cols, rows, seed, right, down, diag]
  );

  useEffect(() => {
    const gsap = initGsap();
    const el = svg.current;
    if (!el || reducedMotion()) return;

    let tl;
    let st;
    const setup = () => {
      const lines = Array.from(el.querySelectorAll('path'));
      const dots = Array.from(el.querySelectorAll('circle'));

      // Measure every path before styling any of them. Interleaving the two
      // forces a style recalc per path.
      const lengths = lines.map((p) => p.getTotalLength());
      lines.forEach((p, i) => {
        p.style.strokeDasharray = `${lengths[i]}`;
        p.style.strokeDashoffset = `${lengths[i]}`;
      });
      gsap.set(dots, { opacity: 0 });

      tl = gsap.timeline({
        paused: true,
        delay,
      });

      tl.to(lines, {
        strokeDashoffset: 0,
        duration: duration * 0.6,
        ease: 'none',
        stagger: { amount: duration * 0.4, from: 'start' },
      }).to(
        dots,
        {
          opacity: 1,
          duration: duration * 0.3,
          ease: 'expo.out',
          stagger: { amount: duration * 0.4, from: 'start' },
        },
        duration * 0.22
      );

      timeline.current = tl;

      if (mode === 'scroll') {
        st = ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => tl.play(0),
        });
      } else if (mode === 'load') {
        tl.play(0);
      } else if (active) {
        tl.play(0);
      }
    };

    // A field that waits for scroll is below the fold, it can wait for the
    // visitor's first input too. The scenes it sits in build first.
    let cancel = () => {};
    if (mode === 'scroll') cancel = afterFirstInput(0, setup);
    else setup();

    return () => {
      cancel();
      st?.kill();
      tl?.kill();
      timeline.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit, duration, mode, delay]);

  // "manual" mode waits for the parent to flip `active`.
  useEffect(() => {
    if (mode === 'manual' && active) timeline.current?.play(0);
  }, [mode, active]);

  return (
    <svg
      ref={svg}
      className={className}
      viewBox={`0 0 ${circuit.width} ${circuit.height}`}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="#1273C2" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {circuit.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#1273C2">
        {circuit.nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={nodeRadius} />
        ))}
      </g>
    </svg>
  );
}
