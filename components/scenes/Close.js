'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Photo from '@/components/Photo';
import WordReveal, { toWords } from '@/components/WordReveal';
import { afterFirstInput, initGsap, LANDING_URL, reducedMotion } from '@/lib/motion';

const HEADLINE = [toWords('Complete the circuit.')];

/** Bottom edge positions of the five nodes, left to right. */
const NODES = [10, 30, 50, 70, 90];

const PRIORITY = 1;

/**
 * The loop runs out of the crest, down the left side, through the five
 * nodes along the bottom, up the right side and back into the crest. Each
 * piece is listed in the order the current travels it, with the edge its
 * lit line grows from.
 */
const SEGMENTS = [
  { key: 'tl', style: { top: 0, left: 0, width: 'calc(50% - 46px)', height: 1 }, origin: '100% 50%', axis: 'scaleX' },
  { key: 'l', style: { top: 0, left: 0, width: 1, height: '100%' }, origin: '50% 0%', axis: 'scaleY' },
  ...[0, ...NODES].map((from, i, all) => ({
    key: `b${i}`,
    node: i > 0 ? i - 1 : null,
    style: {
      bottom: 0,
      left: `${from}%`,
      width: `${(all[i + 1] ?? 100) - from}%`,
      height: 1,
    },
    origin: '0% 50%',
    axis: 'scaleX',
  })),
  { key: 'r', style: { top: 0, right: 0, width: 1, height: '100%' }, origin: '50% 100%', axis: 'scaleY' },
  { key: 'tr', style: { top: 0, right: 0, width: 'calc(50% - 46px)', height: 1 }, origin: '100% 50%', axis: 'scaleX' },
];

export default function Close() {
  const loop = useRef(null);
  const crest = useRef(null);
  const glow = useRef(null);
  const headline = useRef(null);
  const cta = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    let ctx;
    const cancel = afterFirstInput(PRIORITY, () => {
      ctx = gsap.context(() => {
        const segs = SEGMENTS.map((s) => loop.current.querySelector(`[data-seg="${s.key}"] > i`));
        const nodes = loop.current.querySelectorAll('.loop-node > i');
        const words = headline.current.querySelectorAll('.js-word-inner');

        SEGMENTS.forEach((s, i) => gsap.set(segs[i], { [s.axis]: 0, transformOrigin: s.origin }));
        gsap.set(nodes, { opacity: 0, scale: 0.4 });
        gsap.set(glow.current, { opacity: 0, scale: 0.6 });
        gsap.set(crest.current, { filter: 'brightness(0.45) drop-shadow(0 0 0px rgba(18,115,194,0))' });
        gsap.set(cta.current, { opacity: 0, y: 16 });

        const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

        // The current goes round once. Each node it reaches lights and holds.
        // Segments run on their own clock, the node flashes overlap them.
        let at = 0;
        SEGMENTS.forEach((s, i) => {
          const run = s.axis === 'scaleY' ? 0.2 : s.key.startsWith('b') ? 0.12 : 0.22;
          tl.to(segs[i], { [s.axis]: 1, duration: run }, at);
          if (s.node !== null && s.node !== undefined) {
            tl.to(
              nodes[s.node],
              { keyframes: { opacity: [0, 1, 0.3, 1] }, scale: 1, duration: 0.3, ease: 'expo.out' },
              at
            );
          }
          at += run;
        });

        // Back at the crest, the circuit is whole.
        tl.to(
          crest.current,
          {
            filter: 'brightness(1) drop-shadow(0 0 22px rgba(18,115,194,0.85))',
            duration: 0.8,
            ease: 'power2.out',
          },
          at - 0.05
        )
          .to(glow.current, { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' }, '<')
          .fromTo(
            words,
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 },
            '<0.15'
          )
          .to(cta.current, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '<0.35');

        ScrollTrigger.create({
          trigger: loop.current,
          start: 'top 72%',
          once: true,
          refreshPriority: PRIORITY,
          onEnter: () => tl.play(),
        });
      }, loop.current.closest('section'));
    });

    return () => {
      cancel();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      id="close"
      className="cv-auto relative isolate flex min-h-[100svh] w-full flex-col items-center bg-hls-black px-5 pb-8 pt-[clamp(120px,18vh,180px)] text-center md:px-10 md:pb-10"
    >
      {/* Behind the copy, which is in normal flow. */}
      <Photo src="/photos/hall-dawn.png" className="absolute inset-0 -z-10 opacity-40" />
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div
          ref={loop}
          className="relative h-[clamp(120px,20vh,190px)] w-[min(640px,100%)]"
          aria-hidden="true"
        >
          {SEGMENTS.map((s) => (
            <span key={s.key} data-seg={s.key} className="loop-seg" style={s.style}>
              <i />
            </span>
          ))}

          {NODES.map((left) => (
            <span key={left} className="loop-node" style={{ left: `${left}%` }}>
              <i />
            </span>
          ))}

          <div className="absolute left-1/2 top-0 h-[84px] w-[64px] -translate-x-1/2 -translate-y-1/2">
            <span ref={glow} className="crest-glow" />
            <Image
              ref={crest}
              src="/hls_crest.png"
              alt=""
              width={706}
              height={930}
              sizes="64px"
              className="relative h-full w-auto"
            />
          </div>
        </div>

        <div ref={headline} className="mt-[clamp(56px,10vh,104px)]">
          <WordReveal as="h2" mode="manual" lines={HEADLINE} className="scene-line text-hls-platinum" />
        </div>

        {/* GSAP fades the wrapper, the link keeps its own hover transition. */}
        <div ref={cta} className="mt-[clamp(32px,6vh,56px)]">
          <a
            href={LANDING_URL}
            className="group relative inline-flex items-center gap-3 bg-hls-signal px-6 py-5 font-mono text-[12px] font-medium uppercase leading-none tracking-[0.18em] text-hls-black transition-opacity duration-300 hover:opacity-90 sm:px-9 sm:text-[13px] md:px-11 md:py-6 md:tracking-[0.22em]"
          >
            <span>Find where yours breaks</span>
            <span aria-hidden="true">&rarr;</span>

            {/* Circuit trace runs the perimeter on hover */}
            <svg
              className="pointer-events-none absolute -inset-[10px] overflow-visible"
              width="100%"
              height="100%"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                pathLength="100"
                stroke="#1273C2"
                strokeWidth="1"
                className="cta-trace"
              />
            </svg>
          </a>
        </div>
      </div>

      <p className="mt-24 font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-hls-slate md:mt-28">
        HIM LIFE SCHOOL · LEARN TO LIVE · 2026
      </p>
    </section>
  );
}
