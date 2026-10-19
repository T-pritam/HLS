'use client';

import { useEffect, useRef } from 'react';
import CircuitField from '@/components/CircuitField';
import Photo from '@/components/Photo';
import WordReveal, { toWords } from '@/components/WordReveal';
import { chamfer } from '@/lib/circuit';
import { initGsap, onResize, reducedMotion } from '@/lib/motion';

const HEADLINE = [toWords('You know the syllabus.'), toWords('So why did the marks not come?', true)];

const PRIORITY = 6;

export default function Hero() {
  const section = useRef(null);
  const bg = useRef(null);
  const svg = useRef(null);
  const content = useRef(null);
  const label = useRef(null);
  const cue = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    const reduce = reducedMotion();
    let ctx;
    let first = true;

    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const el = section.current;
        const w = el.clientWidth;
        const h = el.clientHeight;

        // The lit trace runs in from the left edge just above the label,
        // and is gone by the middle of the screen.
        const y = Math.round(
          label.current.getBoundingClientRect().top - el.getBoundingClientRect().top - 34
        );
        const jog = Math.round(Math.min(56, Math.max(26, h * 0.055)));
        const d = chamfer(
          [
            [-12, y],
            [w * 0.2, y],
            [w * 0.2, y - jog],
            [w * 0.38, y - jog],
            [w * 0.38, y],
            [w * 0.72, y],
          ],
          18
        );

        const s = svg.current;
        s.setAttribute('viewBox', `0 0 ${w} ${h}`);
        s.querySelectorAll('linearGradient').forEach((g) => g.setAttribute('x2', w * 0.66));
        const [glow, core, pulse] = s.querySelectorAll('path');
        [glow, core, pulse].forEach((p) => p.setAttribute('d', d));

        if (reduce) {
          pulse.style.display = 'none';
          return;
        }

        gsap.fromTo(
          [glow, core],
          { drawSVG: '0%' },
          { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut', delay: first ? 0.95 : 0 }
        );

        // A short packet of current runs the trace every few seconds and
        // burns out where the trace fades.
        const len = pulse.getTotalLength();
        const packet = 90;
        gsap.set(pulse, {
          strokeDasharray: `${packet} ${len + packet}`,
          strokeDashoffset: packet,
        });
        gsap.to(pulse, {
          strokeDashoffset: -len * 0.8,
          duration: 2.4,
          ease: 'power1.in',
          repeat: -1,
          repeatDelay: 2.2,
          delay: first ? 2.4 : 0.6,
        });

        if (first) {
          gsap.to(label.current, { opacity: 1, duration: 0.8, ease: 'expo.out', delay: 1.0 });
          gsap.to(cue.current, { opacity: 1, duration: 0.8, ease: 'expo.out', delay: 2.2 });
        } else {
          gsap.set([label.current, cue.current], { opacity: 1 });
        }

        // Scroll cue, draws down then drains down, forever.
        const bar = cue.current.firstChild;
        gsap
          .timeline({ repeat: -1, delay: 2.4, defaults: { ease: 'power1.inOut' } })
          .fromTo(bar, { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 1.1 })
          .set(bar, { transformOrigin: 'bottom center' })
          .to(bar, { scaleY: 0, duration: 1.1 })
          .to({}, { duration: 0.35 });

        // The question lifts away over the first screen of scroll while the
        // circuit trails at half speed.
        gsap.to(content.current, {
          yPercent: -16,
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            refreshPriority: PRIORITY,
          },
        });
        gsap.to(bg.current, {
          y: () => window.innerHeight * 0.5,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
            refreshPriority: PRIORITY,
          },
        });
      }, section);
      first = false;
    };

    // Measured after the webfonts land, the label moves when they swap in.
    let off = () => {};
    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      build();
      off = onResize(build);
    });

    return () => {
      cancelled = true;
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={section}
      id="hero"
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-hls-black"
    >
      <div ref={bg} className="pointer-events-none absolute inset-0">
        <Photo src="/photos/hero-hall.png" priority className="absolute inset-0 opacity-50" />
        <div className="absolute inset-0 opacity-[0.13]">
          <CircuitField
            className="h-full w-full"
            cols={6}
            rows={5}
            seed={20260804}
            duration={2}
            mode="load"
            delay={0.9}
            right={0.72}
            down={0.3}
            diag={0.08}
          />
        </div>

        <svg
          ref={svg}
          className="absolute inset-0 h-full w-full"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="hero-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="0">
              <stop offset="0" stopColor="#1273C2" stopOpacity="1" />
              <stop offset="0.5" stopColor="#1273C2" stopOpacity="0.8" />
              <stop offset="1" stopColor="#1273C2" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hero-pulse" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="0">
              <stop offset="0" stopColor="#E6F2FC" stopOpacity="1" />
              <stop offset="0.6" stopColor="#9CCBF0" stopOpacity="0.7" />
              <stop offset="1" stopColor="#9CCBF0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path stroke="url(#hero-fade)" strokeWidth="8" strokeOpacity="0.2" strokeLinecap="round" />
          <path stroke="url(#hero-fade)" strokeWidth="1.5" />
          <path stroke="url(#hero-pulse)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div
        ref={content}
        className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-5 pb-[clamp(88px,17svh,180px)] md:px-10"
      >
        <p ref={label} className="kicker js-fade text-hls-mist">
          CA FINAL · GROUP 1 REPEATERS
        </p>
        <WordReveal
          as="h1"
          lines={HEADLINE}
          mode="load"
          prerender
          delay={1.0}
          stagger={0.07}
          duration={1}
          className="display hero-headline mt-[clamp(20px,3.5vh,36px)] max-w-[15em] text-hls-platinum"
        />
      </div>

      <div
        ref={cue}
        aria-hidden="true"
        className="js-fade rm-hide absolute bottom-[clamp(24px,5vh,44px)] left-5 z-10 md:left-10"
      >
        <span className="block h-[clamp(36px,6vh,56px)] w-px origin-top bg-hls-signal" />
      </div>
    </section>
  );
}
