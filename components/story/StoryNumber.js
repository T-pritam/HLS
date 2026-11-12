'use client';

import { useEffect, useRef } from 'react';
import { initGsap, reducedMotion } from '@/lib/motion';
import { SHOW_STAT, STAT_LABEL, STAT_VALUE } from '@/lib/story-facts';

/** How many of the hundred desks light: the percentage, rounded. */
const LIT = Math.max(0, Math.min(100, Math.round(parseFloat(STAT_VALUE)) || 0));

/** A fixed, seeded scatter, so the lit desks are never a row and never move. */
const ORDER = (() => {
  let s = 20261024;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const all = Array.from({ length: 100 }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, LIT);
})();
const RANK = new Map(ORDER.map((desk, i) => [desk, i]));

const pad = (n) => String(n).padStart(2, '0');

/** "12%" as its number and what follows it, so the number can count. */
const FIGURE = parseFloat(STAT_VALUE) || 0;
const UNIT = STAT_VALUE.replace(/^[\d.,\s]+/, '');

/** The label in two lines: its first part, then the rest. */
const [LABEL_HEAD, ...LABEL_REST] = STAT_LABEL.split(' · ');

/** A desk: a rounded top on two legs. Plain divs, sized by its cell. */
function Glyph({ className = '' }) {
  return (
    <span className={`absolute inset-0 ${className}`}>
      <span className="absolute inset-x-0 top-0 h-[38%] rounded-[3px] bg-current" />
      <span className="absolute left-[16%] top-[38%] h-[62%] w-[8%] min-w-[1.5px] bg-current" />
      <span className="absolute right-[16%] top-[38%] h-[62%] w-[8%] min-w-[1.5px] bg-current" />
    </span>
  );
}

/**
 * One hundred desks, then the share of them that pass. One pinned stage,
 * one ScrollTrigger, one timeline. Hidden entirely when SHOW_STAT is off.
 */
export default function StoryNumber() {
  const section = useRef(null);
  const grid = useRef(null);
  const counter = useRef(null);
  const block = useRef(null);
  const figure = useRef(null);
  const digits = useRef(null);

  // The stage clears the nav by its real height, whatever the breakpoint.
  useEffect(() => {
    const header = document.querySelector('header');
    const story = section.current?.closest('#story');
    if (!header || !story) return;
    const set = () => story.style.setProperty('--nav-h', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const gsap = initGsap();
    if (!SHOW_STAT || reducedMotion()) return;
    const digitsEl = digits.current;

    const ctx = gsap.context(() => {
      const lit = [...grid.current.querySelectorAll('[data-lit]')].sort(
        (a, b) => Number(a.dataset.lit) - Number(b.dataset.lit)
      );
      const items = block.current.querySelectorAll('[data-rise]');
      const count = { n: FIGURE };
      let counting;
      const at = lit.map((_, i) => 0.8 + i * 0.35);

      gsap.set(grid.current, { opacity: 0 });
      gsap.set(lit, { opacity: 0, scale: 0.9 });
      gsap.set(items, { opacity: 0, x: -24 });
      gsap.set(figure.current, { opacity: 0, scale: 0.92 });

      let tl;
      let shown = -1;
      const tick = () => {
        const t = tl ? tl.time() : 0;
        const n = at.filter((a) => t >= a).length;
        if (n === shown) return;
        shown = n;
        counter.current.textContent = `${pad(Math.max(1, n))} / 100`;
      };

      tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: tick,
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          // Above The Three Moments (10), so measured first.
          refreshPriority: 20,
          // Layers are promoted only while the stage is in play.
          onToggle: (self) => section.current.classList.toggle('is-active', self.isActive),
          // A refresh moves the timeline without firing onUpdate.
          onRefresh: tick,
        },
      });

      // The room appears as one piece, every desk dark.
      tl.to(grid.current, { opacity: 1, duration: 0.6 }, 0);
      // Twelve desks light, one at a time, nowhere in particular.
      lit.forEach((desk, i) =>
        tl.to(desk, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, at[i])
      );
      // Only after the last one: the number, which counts up in its own
      // time, then its source and the line. The digits always end on the
      // real figure, and a screen reader only ever gets that.
      const after = at[at.length - 1] + 0.4;
      tl.to(figure.current, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, after);
      tl.call(
        () => {
          if (tl.scrollTrigger?.direction < 0) return;
          counting?.kill();
          count.n = 0;
          counting = gsap.to(count, {
            n: FIGURE,
            duration: 0.9,
            ease: 'power2.out',
            onUpdate: () => (digits.current.textContent = String(Math.round(count.n))),
            onComplete: () => (digits.current.textContent = String(FIGURE)),
          });
        },
        null,
        after
      );
      tl.to(items, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', stagger: 0.2 }, after + 0.5);
      tl.to({}, { duration: 1.2 });
      tick();
    }, section);

    return () => {
      ctx.revert();
      if (digitsEl) digitsEl.textContent = String(FIGURE);
    };
  }, []);

  if (!SHOW_STAT) return null;

  return (
    <section
      ref={section}
      id="story-number"
      className="story-number rm-flow rm-pad relative h-[100svh] w-full overflow-hidden bg-hls-black"
    >
      {/* Narrow: caption, number, then the grid. Wide: a square grid centred
          under the nav in the right 58%, caption and number on the left. */}
      <div className="rm-flow mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 px-5 pb-6 pt-[calc(var(--nav-h,120px)+16px)] lg:grid lg:grid-cols-[42fr_58fr] lg:grid-rows-[1fr_auto_1fr] lg:max-w-none lg:gap-x-10 lg:gap-y-0 lg:pl-[var(--frame-l)] lg:pr-10 lg:pb-0 lg:pt-[var(--nav-h,120px)]">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="kicker text-hls-mist">100 CANDIDATES. ONE DESK EACH.</p>
          <p ref={counter} className="meta mt-3 tabular-nums text-signal-read" aria-hidden="true">
            {pad(LIT)} / 100
          </p>
        </div>

        <div className="max-lg:order-3 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:items-center lg:justify-center">
          <div
            ref={grid}
            aria-hidden="true"
            className="desk-grid grid grid-cols-10 grid-rows-10 gap-x-[1.6%] gap-y-[1.6%] [contain:layout_paint]"
          >
            {Array.from({ length: 100 }, (_, i) => (
              <span key={i} className="relative mx-auto aspect-[18/13] w-[78%] self-center">
                <Glyph className="text-hls-mist/25" />
                {RANK.has(i) ? (
                  <span data-lit={RANK.get(i)} className="desk-lit absolute inset-0">
                    {/* The glow is baked in and never animates on its own. */}
                    <span className="absolute -inset-[60%] rounded-full bg-[radial-gradient(circle,rgba(18,115,194,0.55)_0%,rgba(18,115,194,0)_65%)]" />
                    <Glyph className="text-hls-signal" />
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        <div ref={block} className="max-lg:order-2 lg:col-start-1 lg:row-start-2 lg:mt-8">
          <p
            ref={figure}
            className="origin-bottom-left whitespace-nowrap font-display text-[clamp(7rem,34vw,12rem)] font-normal leading-[0.85] tracking-[-0.04em] text-hls-platinum lg:text-[clamp(9rem,18vw,21rem)]"
          >
            <span className="sr-only">{STAT_VALUE}</span>
            <span aria-hidden="true">
              <span ref={digits}>{FIGURE}</span>
              <span className="text-[0.55em] text-hls-signal">{UNIT}</span>
            </span>
          </p>
          <p data-rise className="mt-4 font-mono text-[13px] uppercase leading-[1.6] tracking-[0.12em] text-hls-mist lg:mt-6 lg:text-[14px] lg:tracking-[0.14em]">
            <span className="block">{LABEL_HEAD}</span>
            {LABEL_REST.length ? <span className="block">{LABEL_REST.join(' · ')}</span> : null}
          </p>
          <p
            data-rise
            className="mt-3 max-w-[22em] font-display text-[clamp(14px,1.45vw,24px)] leading-[1.3] tracking-[-0.01em] text-hls-platinum/85 lg:mt-5"
          >
            Most people who sit this paper don&apos;t get the result they worked for.
          </p>
        </div>
      </div>
    </section>
  );
}
