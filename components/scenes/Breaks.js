'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import CircuitField from '@/components/CircuitField';
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

// 01 and 03 carry a caption baked into the artwork. `crop` hides it in CSS,
// the source files stay as delivered.
const BREAKS = [
  { n: '01', phrase: 'What to study', img: '/facet_01.webp', crop: true },
  { n: '02', phrase: 'How to study', img: '/facet_02.webp' },
  { n: '03', phrase: 'How to recall', img: '/facet_03.webp', crop: true },
  { n: '04', phrase: 'How to present', img: '/facet_04.webp' },
  { n: '05', phrase: 'Under pressure', img: '/facet_05.webp' },
];

const OUTRO = [toWords('Five places the marks leak.'), toWords('Most preparation fixes one.', true)];

const PRIORITY = 4;

/** Half the width of each break in the trace. */
const GAP = 13;

/** Timeline units: one pan between nodes, one full cycle per node. */
const PAN = 1.3;
const CYCLE = 2.8;

/**
 * The world the camera moves through, in screen pixels at zoom 1. Wide
 * screens run it left to right along a bus at 58% height, narrow screens
 * run it down the left gutter.
 */
function world(w, h, wide) {
  const entry = handoffX(w, wide);

  if (wide) {
    const y = Math.round(h * 0.58);
    const D = Math.round(w * 0.82);
    const x0 = entry + Math.round(w * 0.8);
    const nodes = BREAKS.map((_, i) => x0 + i * D);
    const end = nodes[4] + Math.round(w * 2.4);

    let bus = chamfer([[entry, -40], [entry, y], [nodes[0] - GAP, y]], 40);
    nodes.forEach((x, i) => {
      bus += ` M${x + GAP} ${y} L${i < 4 ? nodes[i + 1] - GAP : end} ${y}`;
    });

    let branches = '';
    const vias = [];
    nodes.forEach((x, i) => {
      const up = Math.round(h * (i % 2 ? 0.14 : 0.22));
      const down = Math.round(h * (i % 2 ? 0.2 : 0.12));
      const a = x + Math.round(D * 0.5);
      const b = x + Math.round(D * 0.66);
      branches += ` ${chamfer([[a, y], [a, y - up], [a + D * 0.12, y - up]], 14)}`;
      branches += ` ${chamfer([[b, y], [b, y + down], [b + D * 0.1, y + down]], 14)}`;
      vias.push([a + D * 0.12, y - up], [b + D * 0.1, y + down]);
    });

    const zoom = (w * 0.7) / (4 * D);
    return {
      wide,
      bus,
      branches,
      vias,
      nodes: nodes.map((x) => [x, y]),
      bursts: nodes.map((x) => [[x - D * 0.6, y], [x - GAP, y]]),
      // Camera stops: centre of the screen in world coordinates.
      stops: nodes.map((x) => ({ x, y: h / 2 })),
      start: { x: w / 2, y: h / 2, s: 1 },
      overview: {
        x: nodes[2],
        y: y + (0.08 * h) / zoom,
        s: zoom,
      },
      busVar: { '--bus-y': `${(y / h) * 100}%` },
    };
  }

  const x = entry;
  const D = Math.round(h * 0.9);
  const y0 = Math.round(h * 1.1);
  const nodes = BREAKS.map((_, i) => y0 + i * D);
  const end = nodes[4] + Math.round(h * 2.4);

  let bus = `M${x} -40 L${x} ${nodes[0] - GAP}`;
  nodes.forEach((y, i) => {
    bus += ` M${x} ${y + GAP} L${x} ${i < 4 ? nodes[i + 1] - GAP : end}`;
  });

  let branches = '';
  const vias = [];
  nodes.forEach((y, i) => {
    const a = y + Math.round(D * 0.5);
    const b = y + Math.round(D * 0.68);
    const reach = Math.round(w * (i % 2 ? 0.22 : 0.34));
    branches += ` ${chamfer([[x, a], [x + reach, a], [x + reach, a + h * 0.07]], 12)}`;
    branches += ` ${chamfer([[x, b], [x + w * 0.16, b]], 12)}`;
    vias.push([x + reach, a + h * 0.07], [x + w * 0.16, b]);
  });

  const zoom = (h * 0.62) / (4 * D);
  return {
    wide,
    bus,
    branches,
    vias,
    nodes: nodes.map((y) => [x, y]),
    bursts: nodes.map((y) => [[x, y - D * 0.6], [x, y - GAP]]),
    stops: nodes.map((y) => ({ x: w / 2, y })),
    start: { x: w / 2, y: h / 2, s: 1 },
    // Keeps the bus on the gutter while the camera pulls back.
    overview: { x: x + (w / 2 - x) / zoom, y: nodes[2], s: zoom },
    busVar: { '--bus-x': `${x}px` },
  };
}

export default function Breaks() {
  const section = useRef(null);
  const field = useRef(null);
  const svg = useRef(null);
  const nodesRef = useRef([]);
  const counter = useRef(null);
  const count = useRef(null);
  const outro = useRef(null);

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
        const g = world(w, h, isWide());
        const axis = g.wide ? 'x' : 'y';

        el.dataset.axis = axis;
        gsap.set(el, g.busVar);
        s.setAttribute('viewBox', `0 0 ${w} ${h}`);

        s.querySelector('[data-bus]').setAttribute('d', g.bus);
        s.querySelector('[data-branches]').setAttribute('d', g.branches);
        s.querySelectorAll('[data-via]').forEach((c, i) => {
          c.setAttribute('cx', g.vias[i][0]);
          c.setAttribute('cy', g.vias[i][1]);
        });

        const breaks = s.querySelectorAll('[data-break]');
        const bursts = s.querySelectorAll('[data-burst]');
        breaks.forEach((node, i) => {
          const [x, y] = g.nodes[i];
          node.setAttribute('transform', `translate(${x} ${y})${g.wide ? '' : ' rotate(90)'}`);
        });
        bursts.forEach((b, i) => {
          const [[ax, ay], [bx, by]] = g.bursts[i];
          b.querySelectorAll('path').forEach((p) => p.setAttribute('d', `M${ax} ${ay} L${bx} ${by}`));
        });

        // Radii and stroke widths hold their screen size while the camera
        // pulls back, otherwise the overview is hairlines and specks.
        const sized = Array.from(s.querySelectorAll('[data-r]'));
        const stage = s.querySelector('[data-world]');
        const cam = { ...g.start };
        let lastS = 0;
        const applyCam = () => {
          const k = cam.s;
          stage.setAttribute(
            'transform',
            `matrix(${k} 0 0 ${k} ${w / 2 - cam.x * k} ${h / 2 - cam.y * k})`
          );
          if (k !== lastS) {
            lastS = k;
            s.style.setProperty('--k', `${1 / k}`);
            sized.forEach((c) => c.setAttribute('r', +c.dataset.r / k));
          }
        };

        const nodes = nodesRef.current.filter(Boolean);
        const drift = 70;
        gsap.set(nodes, { autoAlpha: 0 });
        gsap.set(nodes.map((n) => n.querySelector('.brk-art')), { opacity: 0 });
        gsap.set(bursts, { opacity: 0 });
        gsap.set(s.querySelectorAll('[data-arc], [data-flash], [data-ember]'), { opacity: 0 });
        gsap.set(counter.current, { autoAlpha: 0 });

        // The far circuit drifts at a fraction of the camera's speed.
        gsap.set(field.current, g.wide ? { width: '140%', height: '100%' } : { width: '100%', height: '140%' });

        const arrivals = BREAKS.map((_, i) => 0.2 + PAN + i * CYCLE);
        let tl;
        let shown = -1;
        const syncCounter = () => {
          // The trigger can render before the timeline is assigned.
          const t = tl ? tl.time() : 0;
          let idx = 0;
          arrivals.forEach((a, i) => {
            if (t >= a - PAN * 0.5) idx = i;
          });
          if (idx !== shown) {
            shown = idx;
            count.current.textContent = BREAKS[idx].n;
          }
        };

        const zoomAt = 0.2 + 5 * CYCLE;
        const outroWords = outro.current.querySelectorAll('.js-word-inner');

        tl = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: () => {
            applyCam();
            syncCounter();
          },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '+=720%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
          },
        });

        tl.to(counter.current, { autoAlpha: 1, duration: 0.4 }, 0.2);
        tl.to(
          field.current,
          g.wide ? { x: -w * 0.4, duration: zoomAt } : { y: -h * 0.4, duration: zoomAt },
          0
        );

        BREAKS.forEach((_, i) => {
          const a = arrivals[i];
          const node = nodes[i];
          const stop = g.stops[i];
          const burst = bursts[i];
          const brk = breaks[i];
          const [[sx, sy], [ex, ey]] = g.bursts[i];
          const head = burst.querySelector('[data-head]');

          // The camera travels the trace to the next break...
          tl.to(cam, { x: stop.x, y: stop.y, duration: PAN, ease: 'power2.inOut' }, a - PAN);

          // ...and a burst of current runs ahead of it into the gap.
          tl.to(burst, { opacity: 1, duration: 0.05 }, a - PAN * 0.75);
          tl.fromTo(
            burst.querySelectorAll('path'),
            { drawSVG: '0% 0%' },
            { drawSVG: '0% 100%', duration: PAN * 0.75, ease: 'power1.in' },
            a - PAN * 0.75
          );
          tl.fromTo(
            head,
            { attr: { cx: sx, cy: sy }, opacity: 0 },
            { attr: { cx: ex, cy: ey }, opacity: 1, duration: PAN * 0.75, ease: 'power1.in' },
            a - PAN * 0.75
          );

          // It arcs across the break, flickers, and goes out.
          tl.to(burst, { keyframes: { opacity: [1, 0.25, 0.9, 0.1, 0.55, 0] }, duration: 0.6 }, a);
          tl.to(
            brk.querySelector('[data-arc]'),
            { keyframes: { opacity: [0, 1, 0.1, 0.9, 0, 0.7, 0] }, duration: 0.6 },
            a
          );
          tl.to(
            brk.querySelector('[data-flash]'),
            { keyframes: { opacity: [0, 0.9, 0.2, 0.7, 0] }, duration: 0.6 },
            a
          );
          tl.to(brk.querySelector('[data-ember]'), { opacity: 0.55, duration: 0.4 }, a + 0.35);

          // What the break is called.
          tl.fromTo(
            node,
            { autoAlpha: 0, [axis]: drift },
            { autoAlpha: 1, [axis]: 0, duration: 0.5, ease: 'power2.out' },
            a - 0.15
          );
          tl.fromTo(
            node.querySelector('.brk-num .js-word-inner'),
            { y: 0, yPercent: 105 },
            { yPercent: 0, duration: 0.7, ease: 'power3.out' },
            a - 0.05
          );
          tl.to(
            node.querySelector('.brk-art'),
            { keyframes: { opacity: [0, 0.7, 0.15, 0.9, 0.4, 1] }, duration: 0.7 },
            a + 0.15
          );
          tl.fromTo(
            node.querySelectorAll('.brk-phrase .js-word-inner'),
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 },
            a + 0.25
          );

          tl.to(
            node,
            { autoAlpha: 0, [axis]: -drift, duration: 0.5, ease: 'power2.in' },
            a + CYCLE - PAN
          );
        });

        // Pull back until all five sit on one line.
        tl.to(cam, { ...g.overview, duration: 1.8, ease: 'power2.inOut' }, zoomAt);
        tl.to(counter.current, { autoAlpha: 0, duration: 0.4 }, zoomAt);
        tl.to(field.current, { opacity: 0.3, duration: 1 }, zoomAt);
        tl.to(
          s.querySelectorAll('[data-ember]'),
          { keyframes: { opacity: [0.55, 1, 0.3, 0.95, 0.75] }, duration: 0.8, stagger: 0.08 },
          zoomAt + 1.5
        );
        tl.fromTo(
          outroWords,
          { y: 0, yPercent: 115 },
          { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 },
          zoomAt + 1.9
        );
        tl.to({}, { duration: 1.2 });

        applyCam();
        syncCounter();
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
      delete section.current?.dataset.axis;
    };
  }, []);

  return (
    <section
      ref={section}
      id="breaks"
      className="cv-auto rm-flow rm-pad relative h-[100svh] w-full overflow-hidden bg-hls-black"
    >
      <div ref={field} className="rm-hide pointer-events-none absolute left-0 top-0 h-full w-full">
        <div className="h-full w-full opacity-[0.08]">
          <CircuitField
            className="h-full w-full"
            cols={9}
            rows={6}
            seed={20261105}
            duration={2.4}
            mode="scroll"
            right={0.62}
            down={0.32}
            diag={0.05}
          />
        </div>
      </div>

      <svg
        ref={svg}
        className="rm-hide pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="break-ember">
            <stop offset="0" stopColor="#9CCBF0" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#1273C2" stopOpacity="0.55" />
            <stop offset="1" stopColor="#1273C2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="break-flash">
            <stop offset="0" stopColor="#F4FAFF" stopOpacity="1" />
            <stop offset="0.18" stopColor="#6AAEE6" stopOpacity="0.6" />
            <stop offset="1" stopColor="#1273C2" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g data-world>
          <path
            data-branches
            stroke="#1273C2"
            strokeOpacity="0.14"
            style={{ strokeWidth: 'calc(1.2px * var(--k, 1))' }}
          />
          {Array.from({ length: 10 }, (_, i) => (
            <circle
              key={i}
              data-via
              data-r="3"
              r="3"
              fill="#000"
              stroke="#1273C2"
              strokeOpacity="0.3"
              style={{ strokeWidth: 'calc(1px * var(--k, 1))' }}
            />
          ))}
          <path
            data-bus
            stroke="#1273C2"
            strokeOpacity="0.34"
            style={{ strokeWidth: 'calc(1.5px * var(--k, 1))' }}
          />

          {BREAKS.map((b) => (
            <g key={b.n} data-burst>
              <path stroke="#1273C2" strokeOpacity="0.3" style={{ strokeWidth: 'calc(6px * var(--k, 1))' }} />
              <path stroke="#6AAEE6" style={{ strokeWidth: 'calc(1.6px * var(--k, 1))' }} />
              <circle data-head data-r="20" r="20" cx="0" cy="0" fill="url(#break-flash)" />
            </g>
          ))}

          {BREAKS.map((b) => (
            <g key={b.n} data-break>
              <circle data-ember data-r="26" r="26" fill="url(#break-ember)" />
              <circle data-flash data-r="70" r="70" fill="url(#break-flash)" />
              <path
                data-arc
                d={`M${-GAP} 0 L-5 -6 L1 5 L5 -3 L${GAP} 0`}
                stroke="#E6F2FC"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              {[-GAP, GAP].map((x) => (
                <circle
                  key={x}
                  cx={x}
                  cy="0"
                  data-r="3.5"
                  r="3.5"
                  fill="#000"
                  stroke="#1273C2"
                  style={{ strokeWidth: 'calc(1.2px * var(--k, 1))' }}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>

      <div className="rm-flow relative mx-auto h-full w-full max-w-[1600px] px-5 md:px-10 [[data-axis]_&]:max-w-none [[data-axis]_&]:px-0">
        {BREAKS.map((b, i) => (
          <article
            key={b.n}
            ref={(node) => {
              nodesRef.current[i] = node;
            }}
            className="brk-node"
          >
            <span className="brk-num text-hls-platinum" aria-hidden="true">
              <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <span className="js-word-inner">{b.n}</span>
              </span>
            </span>
            <WordReveal
              as="h3"
              mode="manual"
              lines={[toWords(b.phrase)]}
              className="brk-phrase text-hls-platinum"
            />
            <div className="brk-art">
              <div
                className="absolute inset-0"
                style={b.crop ? { clipPath: 'inset(0 0 24% 0)', transform: 'translateY(12%)' } : undefined}
              >
                <Image
                  src={b.img}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(max-width: 767px) 60vw, 360px"
                  className="object-contain"
                  style={{ filter: 'url(#hls-ink)' }}
                />
              </div>
            </div>
          </article>
        ))}

        <p ref={counter} className="brk-counter rm-hide meta text-hls-mist" aria-hidden="true">
          <span ref={count}>01</span> / 05
        </p>

        <div ref={outro} className="brk-outro">
          <WordReveal
            as="p"
            mode="manual"
            lines={OUTRO}
            className="scene-line text-hls-platinum"
          />
        </div>
      </div>
    </section>
  );
}
