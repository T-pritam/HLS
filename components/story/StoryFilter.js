'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { initGsap, onResize, pinLength, reducedMotion, refreshSoon } from '@/lib/motion';
import SignalStrands from './SignalStrands';
import StoryCta from './StoryCta';

const CHIPS = ['Was it how I studied?', 'Or how I wrote?', 'The time?', 'Audit?', 'Nerves?'];

const CAPTIONS = ['Five guesses.', 'All at once. None answered.', 'Now read it properly.', 'One clear line.'];

const CAPTION =
  'font-display text-[clamp(30px,min(4.6vw,8vh),68px)] italic leading-[1.1] tracking-[-0.015em] text-hls-platinum [text-wrap:balance]';

// Between The Three Moments (10) above and the imported Teacher (2) below.
const PRIORITY = 5;

/**
 * The pin, in viewport heights: the sequence runs over the first 350, then
 * everything rests for 40 and the caption clears in the last 8, so nothing
 * but the head and the call to action leaves with the stage.
 */
const RUN = 350;
const REST = 40;
const CLEAR = 8;
/** Phones scroll the same sequence over 60% of the length. */
const PHONE = 0.6;

/** Wide: each chip's left edge (px at 1440 wide, scaled), stacked top to bottom. */
const STAGGER = [0, 50, 15, 70, 30];

/** Narrow: each chip's centre, as fractions of the stage. Chips on top, flowing down. */
const SPOTS_NARROW = [
  [0.3, 0.215],
  [0.72, 0.262],
  [0.21, 0.31],
  [0.53, 0.335],
  [0.82, 0.36],
];

/**
 * Where the brain sits in mind-head.png, as fractions of its square box,
 * measured from the image: centre across and down, its left and top edges.
 */
const BRAIN = { x: 0.53, y: 0.35, left: 0.33, top: 0.19 };

/** Bare event names only, and only if GA4 is on the page. */
function track(name) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', name);
}

/** The filter slit: three thin parallel bars and a soft glow. */
function Slit() {
  return (
    <>
      <span data-slit-glow className="absolute -inset-[60%] rounded-full bg-[radial-gradient(ellipse,rgba(18,115,194,0.5)_0%,rgba(18,115,194,0)_60%)]" />
      <span className="absolute inset-0 flex justify-between lg:flex-row max-lg:flex-col">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block bg-hls-signal lg:h-full lg:w-[2px] max-lg:h-[2px] max-lg:w-full" />
        ))}
      </span>
    </>
  );
}

/** Five guesses, one filter, one clear line, one way forward. */
export default function StoryFilter() {
  const section = useRef(null);
  const chipsRef = useRef(null);
  const slit = useRef(null);
  const head = useRef(null);
  const captions = useRef(null);
  const strands = useRef(null);
  const strandsWrap = useRef(null);
  const cta = useRef(null);
  const ctaBand = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    const still = reducedMotion();
    let shownOnce = false;

    let ctx;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const st = section.current;
        const w = st.clientWidth;
        const h = st.clientHeight;
        const box = st.getBoundingClientRect();
        const wide = w >= 1024;
        const rel = (r) => ({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top });

        const caps = [...captions.current.children];
        const glow = slit.current.querySelector('[data-slit-glow]');
        const dimmer = head.current.querySelector('[data-dim]');
        const calm = head.current.querySelector('[data-calm]');
        const chips = [...chipsRef.current.children];

        // No motion: straight to where the sequence rests.
        if (still) {
          gsap.set(caps.slice(0, -1), { autoAlpha: 0 });
          gsap.set([chipsRef.current, strandsWrap.current, slit.current, dimmer], { autoAlpha: 0 });
          gsap.set(calm, { opacity: 1 });
          return;
        }

        // The brain, then the slit lined up with it.
        const hb = rel(head.current.getBoundingClientRect());
        const size = hb.b - hb.t;
        const brain = {
          x: hb.l + BRAIN.x * size,
          y: hb.t + BRAIN.y * size,
          left: hb.l + BRAIN.left * size,
          top: hb.t + BRAIN.top * size,
        };
        // Narrow: the slit sits just above the brain, not mid-screen, so the
        // strands run into it and the one line out of it lands in the brain.
        const gap = Math.round(Math.min(72, Math.max(40, h * 0.07)));
        slit.current.style.top = `${wide ? brain.y : brain.top - gap}px`;
        slit.current.style.left = wide ? '' : `${brain.x}px`;
        const s = rel(slit.current.getBoundingClientRect());

        // The chips: stacked down the left on wide screens, from the frame's
        // left edge (where the captions start), scattered across the top on narrow.
        const capBox = rel(captions.current.getBoundingClientRect());
        const frameLeft = capBox.l;
        // Narrow: a two-line caption reaches into the chips' band on most
        // phones, so the whole scatter moves down to clear the tallest one,
        // never closer than 40px to the slit.
        let drop = 0;
        if (!wide) {
          const tops = chips.map((c, i) => SPOTS_NARROW[i][1] * h - c.offsetHeight / 2);
          const bottoms = chips.map((c, i) => SPOTS_NARROW[i][1] * h + c.offsetHeight / 2);
          drop = Math.max(0, Math.min(capBox.b + 12 - Math.min(...tops), s.t - 40 - Math.max(...bottoms)));
        }
        chips.forEach((c, i) => {
          const cw = c.offsetWidth;
          const ch = c.offsetHeight;
          if (wide) {
            c.style.left = `${frameLeft + STAGGER[i] * (w / 1440)}px`;
            c.style.top = `${h * (0.33 + i * 0.128) - ch / 2}px`;
          } else {
            const x = Math.min(w - 8 - cw, Math.max(8, SPOTS_NARROW[i][0] * w - cw / 2));
            c.style.left = `${x}px`;
            c.style.top = `${SPOTS_NARROW[i][1] * h - ch / 2 + drop}px`;
          }
        });
        const starts = chips.map((c) => {
          const r = rel(c.getBoundingClientRect());
          return wide ? { flow: r.r + 4, across: (r.t + r.b) / 2 } : { flow: r.b + 4, across: (r.l + r.r) / 2 };
        });

        strands.current?.geometry({
          wide,
          cw: wide ? Math.ceil(brain.x + 40) : w,
          ch: wide ? h : Math.ceil(brain.y + 40),
          strands: starts,
          end: wide ? s.l - 6 : s.t - 6,
          exit: wide ? s.r + 6 : s.b + 6,
          centre: wide ? brain.y : brain.x,
          brainEdge: wide ? brain.left : brain.top,
          brainCentre: wide ? brain.x : brain.y,
          scale: wide ? Math.min(1, h / 900) : 0.45,
        });

        // Narrow: the button takes the space between the caption and the head.
        ctaBand.current.style.top = wide ? '' : `${capBox.b + 12}px`;
        ctaBand.current.style.bottom = wide ? '' : `${h - (brain.top - 8)}px`;

        gsap.set(caps.slice(1), { autoAlpha: 0, y: 16 });
        gsap.set(chips, { autoAlpha: 0, y: 12 });
        gsap.set([slit.current, glow, dimmer, calm], { opacity: 0 });
        // Narrow: the filter is there, faint, from the start, so the guesses
        // visibly run into it and stop until it lights.
        if (!wide) gsap.set(slit.current, { opacity: 0.3 });

        // The sequence runs 0 to 10; the rest and the clear add on at the same rate.
        const unit = 10 / RUN;
        let tl;
        const feed = () => strands.current?.progress(Math.min(1, tl.time() / 10));
        tl = gsap.timeline({
          defaults: { ease: 'none' },
          onUpdate: () => {
            feed();
            if (!shownOnce && tl.time() >= 10) {
              shownOnce = true;
              track('story_cta_shown');
            }
          },
          scrollTrigger: {
            trigger: st,
            start: 'top top',
            end: pinLength(RUN + REST + CLEAR, Math.round((RUN + REST + CLEAR) * PHONE)),
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
            // A refresh moves the timeline without firing onUpdate.
            onRefresh: feed,
            // Layers are promoted, and the canvas drifts, only while pinned.
            onToggle: (self) => {
              st.classList.toggle('is-active', self.isActive);
              strands.current?.active(self.isActive);
            },
          },
        });

        let shown = 0;
        const caption = (i, at) => {
          tl.to(caps[shown], { autoAlpha: 0, y: -16, duration: 0.25 }, at).to(
            caps[i],
            { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
            at + 0.2
          );
          shown = i;
        };

        // a 0-30%: five guesses, each growing a strand.
        chips.forEach((c, i) => tl.to(c, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.3 + i * 0.45));

        // b 30-55%: all at once, and the mind flickers.
        caption(1, 3.0);
        tl.to(dimmer, { keyframes: { opacity: [0, 0.7, 0.2, 0.85, 0.35, 0.9, 0.5, 0.75] }, duration: 2.2 }, 3.1);

        // c 55-78%: the filter appears, the wobble irons out, one line runs through.
        caption(2, 5.5);
        tl.to([slit.current, glow], { opacity: 1, duration: 0.5 }, 5.5);

        // d 78-86%: the pulse reaches the brain and it settles.
        caption(3, 7.8);
        tl.to(dimmer, { opacity: 0, duration: 0.5 }, 7.9).to(calm, { opacity: 1, duration: 0.4 }, 8.2);

        // e 86-94%: everything but the head and the caption goes.
        tl.to([...chips, strandsWrap.current, slit.current], { autoAlpha: 0, duration: 0.8 }, 8.6);

        // f 94-100%: the way forward. Then a rest, and the caption clears before the release.
        tl.fromTo(
          cta.current,
          { autoAlpha: 0, scale: 0.94, y: 4 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: 'power2.out' },
          9.4
        );
        tl.to(caps[3], { autoAlpha: 0, duration: CLEAR * unit }, 10 + REST * unit);
        feed();
      }, section);
    };

    build();
    // Chip widths change when the display font arrives, so measure again then.
    let live = true;
    if (!still && document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (!live) return;
        build();
        refreshSoon();
      });
    }
    const off = still
      ? () => {}
      : onResize(() => {
          build();
          refreshSoon();
        });

    return () => {
      live = false;
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <>
      <section
        ref={section}
        id="story-filter"
        className="story-filter relative isolate h-[100svh] w-full overflow-hidden bg-hls-black"
      >
        <div ref={captions} className="absolute inset-x-5 top-[92px] grid md:inset-x-10 lg:inset-x-[var(--frame-l)] lg:top-[108px]">
          {CAPTIONS.map((c) => (
            <p key={c} className={`col-start-1 row-start-1 max-w-[13em] ${CAPTION}`}>
              {c}
            </p>
          ))}
        </div>

        <div
          ref={slit}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:h-[30%] lg:w-[16px] max-lg:h-[16px] max-lg:w-[50%]"
        >
          <Slit />
        </div>

        <div
          ref={head}
          className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 mix-blend-screen lg:left-[76%] lg:top-1/2 lg:h-[min(70svh,40vw)] max-lg:left-1/2 max-lg:top-[76%] max-lg:h-[min(40svh,70vw)]"
        >
          <Image
            src="/photos/mind-head.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 40vw, 70vw"
            className="object-contain"
          />
          {/* Dims the brain when it flickers, and the calm glow when it settles.
              The wrapper blends as a whole: its transform makes it a group of
              its own, so a blend on the image alone would show its black box. */}
          <span data-dim data-layer className="absolute inset-0 bg-[radial-gradient(circle_at_53%_35%,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0)_26%)]" />
          <span data-calm data-layer className="absolute inset-0 bg-[radial-gradient(circle_at_53%_35%,rgba(18,115,194,0.45)_0%,rgba(18,115,194,0)_30%)]" />
        </div>

        {/* Above the head, so the pulse shows inside the brain; under the chips. */}
        <div ref={strandsWrap} data-layer aria-hidden="true">
          <SignalStrands api={strands} />
        </div>

        {/* Decorative: the sentence before them reads them out once. */}
        <p className="sr-only">Five guesses: {CHIPS.join(' ')}</p>
        <div ref={chipsRef} aria-hidden="true">
          {CHIPS.map((c) => (
            <p
              key={c}
              className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-hls-signal/50 bg-hls-black px-3 py-1.5 font-display text-[clamp(14px,1.4vw,20px)] italic text-hls-platinum"
            >
              {c}
            </p>
          ))}
        </div>

        {/* The one way forward: the middle of the stage, where the chips were. */}
        <div ref={ctaBand} className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-center px-5 lg:right-[38%]">
          <div ref={cta} className="pointer-events-auto invisible opacity-0 motion-reduce:visible motion-reduce:opacity-100">
            <StoryCta primary onClick={() => track('story_cta_clicked')} />
          </div>
        </div>
      </section>
      {/* Black room after the pin, so the call to action never meets the marks. */}
      <div aria-hidden="true" className="h-[max(48px,calc(11svh_-_47px))] bg-hls-black" />
    </>
  );
}
