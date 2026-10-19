'use client';

import { useEffect, useRef } from 'react';
import CircuitField from '@/components/CircuitField';
import Photo from '@/components/Photo';
import WordReveal, { toWords } from '@/components/WordReveal';
import { chamfer, handoffX } from '@/lib/circuit';
import {
  afterFirstInput,
  initGsap,
  isWide,
  onResize,
  reducedMotion,
  refreshSoon,
} from '@/lib/motion';

const LINE_A = [toWords('Every attempt, you pour in everything.')];
const LINE_B = [toWords('And somewhere before the exam hall, it goes dark.')];

const PRIORITY = 5;

/** How far along the trace the current gets before it gives up. */
const DIES_AT = 0.6;

/**
 * The route sweeps through the lower half of the screen, clear of the copy,
 * and leaves through the bottom edge where the five breaks pick it up.
 */
function route(w, h, wide) {
  const x = (f) => Math.round(w * f);
  const y = (f) => Math.round(h * f);
  const out = handoffX(w, wide);

  if (wide) {
    return {
      points: [
        [-40, y(0.7)],
        [x(0.2), y(0.7)],
        [x(0.2), y(0.54)],
        [x(0.46), y(0.54)],
        [x(0.46), y(0.78)],
        [x(0.7), y(0.78)],
        [x(0.7), y(0.62)],
        [out, y(0.62)],
        [out, h + 40],
      ],
      vias: [
        [x(0.1), y(0.7)],
        [x(0.33), y(0.54)],
        [x(0.58), y(0.78)],
        [x(0.77), y(0.62)],
        [out, y(0.86)],
      ],
    };
  }

  return {
    points: [
      [-40, y(0.5)],
      [x(0.56), y(0.5)],
      [x(0.56), y(0.63)],
      [x(0.84), y(0.63)],
      [x(0.84), y(0.76)],
      [out, y(0.76)],
      [out, h + 40],
    ],
    vias: [
      [x(0.28), y(0.5)],
      [x(0.7), y(0.63)],
      [x(0.5), y(0.76)],
      [out, y(0.88)],
    ],
  };
}

/** Fraction of the path length closest to a point, sampled. */
function fractionAt(path, len, [px, py]) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 120; i++) {
    const p = path.getPointAtLength((len * i) / 120);
    const d = (p.x - px) ** 2 + (p.y - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i / 120;
    }
  }
  return best;
}

export default function Current() {
  const section = useRef(null);
  const svg = useRef(null);
  const dim = useRef(null);
  const textA = useRef(null);
  const textB = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    let ctx;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const el = section.current;
        const s = svg.current;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const { points, vias } = route(w, h, isWide());
        const d = chamfer(points, Math.min(40, w * 0.04));

        s.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const traces = s.querySelectorAll('[data-trace]');
        traces.forEach((p) => p.setAttribute('d', d));
        const base = traces[0];
        const len = base.getTotalLength();

        const rings = s.querySelectorAll('[data-via]');
        const lit = s.querySelectorAll('[data-via-lit]');
        vias.forEach(([vx, vy], i) => {
          [rings[i], lit[i]].forEach((c) => {
            c.setAttribute('cx', vx);
            c.setAttribute('cy', vy);
          });
        });

        const wire = s.querySelectorAll('[data-wire]');
        const packets = s.querySelectorAll('[data-packet]');
        const current = s.querySelector('[data-current]');
        const head = s.querySelector('[data-head]');
        const headGlow = head.querySelector('circle');

        // Wire layers fill from the start, packet layers are a short window
        // riding just behind the head.
        gsap.set(wire, { strokeDasharray: `${len} ${len}`, strokeDashoffset: len });
        packets.forEach((p) => {
          const k = +p.dataset.packet;
          p.style.strokeDasharray = `${k} ${len + k}`;
          p.style.strokeDashoffset = `${k}`;
        });
        gsap.set(lit, { opacity: 0 });
        gsap.set(head, { opacity: 0 });

        const flow = { p: 0 };
        const render = () => {
          const at = len * flow.p;
          wire.forEach((p) => {
            p.style.strokeDashoffset = `${len - at}`;
          });
          packets.forEach((p) => {
            p.style.strokeDashoffset = `${+p.dataset.packet - at}`;
          });
          const pt = base.getPointAtLength(at);
          head.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        };

        const wordsA = textA.current.querySelectorAll('.js-word-inner');
        const wordsB = textB.current.querySelectorAll('.js-word-inner');

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: render,
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '+=280%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
          },
        });

        tl.fromTo(
          wordsA,
          { y: 0, yPercent: 115 },
          { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 },
          0.1
        );

        // It flows, steady, for most of the way.
        const run = DIES_AT * 0.9;
        tl.to(head, { opacity: 1, duration: 0.2 }, 0.3);
        tl.to(flow, { p: run, duration: 4.4 }, 0.3);

        // Every via it passes takes the charge.
        vias.forEach((v, i) => {
          const f = fractionAt(base, len, v);
          if (f < run) tl.to(lit[i], { opacity: 1, duration: 0.18 }, 0.3 + (f / run) * 4.4);
        });

        // Then it stalls, straining against something it cannot see.
        tl.to(flow, { p: DIES_AT, duration: 1.4, ease: 'power3.out' }, 4.7);
        tl.to(
          headGlow,
          { attr: { r: 38 }, duration: 0.28, ease: 'sine.inOut', yoyo: true, repeat: 3 },
          4.9
        );

        // Flickers, and dies.
        tl.to(
          [current, head],
          { keyframes: { opacity: [1, 0.2, 0.85, 0.08, 0.6, 0.05, 0.35, 0] }, duration: 1 },
          6.0
        );
        tl.to(lit, { opacity: 0.15, duration: 0.6 }, 6.5);

        // The screen goes with it.
        tl.to(dim.current, { opacity: 0.62, duration: 1, ease: 'power1.inOut' }, 6.6);
        tl.to(textA.current, { opacity: 0, duration: 0.6 }, 6.6);
        tl.fromTo(
          wordsB,
          { y: 0, yPercent: 115 },
          { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05 },
          7.4
        );
        tl.to({}, { duration: 1.4 });

        render();
      }, section);
    };

    let off = () => {};
    const cancel = afterFirstInput(PRIORITY, () => {
      build();
      off = onResize(() => {
        build();
        refreshSoon();
      });
    });

    return () => {
      cancel();
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={section}
      id="current"
      className="cv-auto rm-pad relative h-[100svh] w-full overflow-hidden bg-hls-black motion-reduce:h-auto"
    >
      <Photo src="/photos/hands-writing.png" className="absolute inset-0 opacity-45" />
      <div className="rm-hide pointer-events-none absolute inset-0 opacity-[0.1]">
        <CircuitField
          className="h-full w-full"
          cols={7}
          rows={5}
          seed={20261017}
          duration={2.2}
          mode="scroll"
          right={0.6}
          down={0.35}
          diag={0.06}
        />
      </div>

      <svg
        ref={svg}
        className="rm-hide pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="current-head">
            <stop offset="0" stopColor="#E6F2FC" stopOpacity="1" />
            <stop offset="0.25" stopColor="#6AAEE6" stopOpacity="0.75" />
            <stop offset="1" stopColor="#1273C2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The route itself, always there, mostly dark. */}
        <path data-trace stroke="#1273C2" strokeOpacity="0.32" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} data-via r="3.5" fill="#000" stroke="#1273C2" strokeOpacity="0.5" />
        ))}

        <g data-current strokeLinecap="round">
          <path data-trace data-wire stroke="#1273C2" strokeWidth="6" strokeOpacity="0.3" />
          <path data-trace data-wire stroke="#6AAEE6" strokeWidth="1.6" />
          <path data-trace data-packet="240" stroke="#1273C2" strokeWidth="16" strokeOpacity="0.2" />
          <path data-trace data-packet="110" stroke="#E6F2FC" strokeWidth="2.2" />
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} data-via-lit r="3.5" fill="#9CCBF0" />
        ))}

        <g data-head>
          <circle r="26" fill="url(#current-head)" />
          <circle r="2.6" fill="#F4FAFF" />
        </g>
      </svg>

      <div ref={dim} className="rm-hide pointer-events-none absolute inset-0 bg-hls-black opacity-0" />

      <div className="rm-flow absolute inset-x-0 top-[clamp(108px,19svh,210px)] z-10 mx-auto w-full max-w-[1600px] px-5 md:px-10">
        <div className="rm-unstack grid">
          <div ref={textA} className="col-start-1 row-start-1">
            <WordReveal
              as="p"
              mode="manual"
              lines={LINE_A}
              className="scene-line max-w-[13em] text-hls-platinum"
            />
          </div>
          <div ref={textB} className="col-start-1 row-start-1">
            <WordReveal
              as="p"
              mode="manual"
              lines={LINE_B}
              className="scene-line max-w-[13em] text-hls-platinum"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
