'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import WordReveal, { toWords } from '@/components/WordReveal';
import MagnetLink from '@/components/ui/MagnetLink';
import { OUTLINE, OutlineArrow } from '@/components/ui/PillLink';
import { initGsap, LANDING_URL, onResize, pinLength, staticScenes, refreshSoon } from '@/lib/motion';

const CONSULTATION = 'THE BLUEPRINT CONSULTATION';
const PROGRAMME = 'THE SCORE IMPROVEMENT PROGRAMME';

const STEPS = [
  { n: '01', line: 'We read your attempt.' },
  { n: '02', line: 'You get a blueprint.' },
  { n: '03', line: 'We work on it, one to one.' },
];


function Label({ text, className = '' }) {
  return (
    <div data-group className={className}>
      <p className="kicker text-signal-read">{text}</p>
    </div>
  );
}

function Step({ n, line, className = '' }) {
  return (
    <div data-step className={`flex flex-col ${className}`}>
 {/* The numeral. The line and its dot are drawn on the stage, under it. */}
      <p data-num className="self-start font-mono text-[15px] font-medium tracking-[0.12em] text-hls-platinum">
        {n}
      </p>
      <WordReveal
        as="p"
        mode="manual"
        lines={[toWords(line)]}
        className="mt-8 font-display text-[clamp(28px,min(3vw,5.4vh),46px)] font-normal leading-[1.1] tracking-[-0.02em] text-hls-platinum [text-wrap:balance]"
      />
    </div>
  );
}

// The three steps and the two ways in. Builds on mount, so its pin is
// created in page order after the three moments.
export default function StoryWays() {
  const stage = useRef(null);
  const cards = useRef(null);
  const track = useRef(null);
  const dotsRef = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (staticScenes()) return;

    let ctx;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const st = stage.current;
        const nums = [...st.querySelectorAll('[data-num]')];
        const steps = [...st.querySelectorAll('[data-step]')];
        const words = steps.map((el) => el.querySelectorAll('.js-word-inner'));
        const labels = [...st.querySelectorAll('[data-group] p')];
        const line = track.current;
        const dots = [...dotsRef.current.children];

        // One straight line through 01, 02 and 03: the filter's line carrying
        // on. Across a wide screen it enters from the viewport's left edge and
        // runs under the numerals to the end of the third step; on a narrow
        // one it runs down the left gutter to the end of the third step.
        const box = st.getBoundingClientRect();
        const r = nums.map((n) => n.getBoundingClientRect());
        const across = Math.abs(r[1].left - r[0].left) > Math.abs(r[1].top - r[0].top);
        const end = steps[2].getBoundingClientRect();
        let at;
        if (across) {
          const y = r[0].bottom - box.top + 12;
          const len = end.right - box.left;
          Object.assign(line.style, { left: '0px', top: `${y - 1}px`, width: `${len}px`, height: '2px', transformOrigin: '0 50%' });
          at = r.map((q) => q.left - box.left + 4);
          dots.forEach((d, i) => Object.assign(d.style, { left: `${at[i]}px`, top: `${y}px` }));
          at = at.map((x) => x / len);
        } else {
          const x = 9;
          const len = end.bottom - box.top;
          Object.assign(line.style, { left: `${x - 1}px`, top: '0px', width: '2px', height: `${len}px`, transformOrigin: '50% 0' });
          at = r.map((q) => (q.top + q.bottom) / 2 - box.top);
          dots.forEach((d, i) => Object.assign(d.style, { left: `${x}px`, top: `${at[i]}px` }));
          at = at.map((y) => y / len);
        }
        const axis = across ? 'scaleX' : 'scaleY';

        gsap.set(line, { [axis]: 0 });
        gsap.set(dots, { opacity: 0.25, scale: 0.6 });
        gsap.set(nums, { opacity: 0 });
        gsap.set(labels, { opacity: 0, y: 10 });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: st,
            start: 'top top',
            end: pinLength(250, 150),
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            // Below the imported Teacher (2), so measured after it.
            refreshPriority: 1,
          },
        });

        // The line reaches each dot just as its step comes up, then runs on
        // to the end of the third.
        const reveal = [1.7, 3.1, 4.7];
        let from = 0.1;
        reveal.forEach((t, i) => {
          tl.to(line, { [axis]: at[i], duration: t - from }, from);
          from = t;
        });
        tl.to(line, { [axis]: 1, duration: 0.7 }, from);

        const group = (i, t) => tl.to(labels[i], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t);
        // Each step: its dot lights, the numeral, then the line itself.
        const entry = (i, t) => {
          tl.to(dots[i], { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, t);
          tl.to(nums[i], { opacity: 1, duration: 0.3 }, t);
          tl.fromTo(
            words[i],
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 },
            t + 0.3
          );
        };

        group(0, 1.3);
        entry(0, reveal[0]);
        entry(1, reveal[1]);
        group(1, 4.3);
        entry(2, reveal[2]);
        tl.to({}, { duration: 1 });

        // The cards rise in once, unless they are already in view.
        const cardEls = cards.current.querySelectorAll('[data-card]');
        const traces = cards.current.querySelectorAll('[data-card-trace]');
        if (cards.current.getBoundingClientRect().top > window.innerHeight * 0.82) {
          gsap.set(cardEls, { opacity: 0, y: 32 });
          gsap.set(traces, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: cards.current,
            start: 'top 82%',
            once: true,
            refreshPriority: 1,
            onEnter: () => {
              gsap.to(cardEls, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 });
              gsap.to(traces, { scaleX: 1, duration: 1.1, ease: 'expo.inOut', stagger: 0.12, delay: 0.1 });
            },
          });
        }
      }, stage.current.closest('section'));
    };
    build();
    const off = onResize(() => {
      build();
      refreshSoon();
    });

    return () => {
      off();
      ctx?.revert();
    };
  }, []);

  return (
    <section id="story-ways" aria-label="Two ways in" className="relative w-full bg-hls-black">
      <div
        ref={stage}
        className="cv-auto rm-flow rm-pad relative flex h-[100svh] w-full items-center overflow-hidden"
      >
        <div aria-hidden="true" className="rm-hide pointer-events-none absolute inset-0">
          <span ref={track} className="absolute block bg-hls-signal" style={{ width: 0, height: 0 }} />
          <div ref={dotsRef}>
            {STEPS.map((s) => (
              <span
                key={s.n}
                className="absolute -ml-[5px] -mt-[5px] block h-[10px] w-[10px] rounded-full bg-hls-signal shadow-[0_0_10px_2px_rgba(18,115,194,0.6)]"
                style={{ opacity: 0 }}
              />
            ))}
          </div>
        </div>
        <div className="story-frame relative mx-auto w-full max-w-[1200px] px-5 md:px-10 lg:max-w-none lg:px-0">
          {/* Stacked on narrow screens in reading order. On wide screens the
              labels share a row above the three steps. */}
          <div className="flex flex-col gap-y-8 md:grid md:grid-cols-3 md:gap-x-12 md:gap-y-10">
            <Label text={CONSULTATION} className="md:col-span-2 md:col-start-1 md:row-start-1 md:self-end" />
            <Step {...STEPS[0]} className="md:col-start-1 md:row-start-2" />
            <Step {...STEPS[1]} className="md:col-start-2 md:row-start-2" />
            <Label text={PROGRAMME} className="mt-4 md:col-start-3 md:row-start-1 md:mt-0 md:self-end" />
            <Step {...STEPS[2]} className="md:col-start-3 md:row-start-2" />
          </div>
        </div>
      </div>

      <div
        ref={cards}
        className="story-frame mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-5 pb-[clamp(96px,16vh,160px)] md:grid-cols-2 md:gap-8 md:px-10 lg:max-w-none lg:px-0"
      >
        {/* The consultation is the first step, so it carries the solid button
            and the brighter edge. */}
        <article data-card className="relative flex flex-col border border-hls-signal/45 p-7 md:p-10">
          <span
            data-card-trace
            aria-hidden="true"
            className="absolute -top-px left-0 block h-px w-full origin-left bg-hls-signal shadow-[0_0_10px_1px_rgba(18,115,194,0.8)]"
          />
          <h3
            id="story-ways-consultation"
            className="font-display text-[clamp(28px,2.6vw,40px)] font-normal leading-[1.08] tracking-[-0.02em] text-hls-platinum"
          >
            The Blueprint Consultation
          </h3>
          <p className="mt-5 max-w-[46ch] font-body text-[clamp(16px,calc(15.046px+0.254vw),17px)] leading-[1.6] text-hls-platinum/75">
            A one-to-one conversation about your attempt, and a personal score-improvement blueprint
            to take away.
          </p>
          <div className="mt-auto pt-10">
            <MagnetLink
              href={LANDING_URL}
              aria-describedby="story-ways-consultation"
              className={OUTLINE}
            >
              <span>See the details</span>
              <OutlineArrow />
            </MagnetLink>
          </div>
        </article>

        <article data-card className="relative flex flex-col border border-hls-mist/20 p-7 md:p-10">
          <span
            data-card-trace
            aria-hidden="true"
            className="absolute -top-px left-0 block h-px w-full origin-left bg-hls-signal/50"
          />
          <h3
            id="story-ways-programme"
            className="font-display text-[clamp(28px,2.6vw,40px)] font-normal leading-[1.08] tracking-[-0.02em] text-hls-platinum"
          >
            The Score Improvement Programme
          </h3>
          <p className="mt-5 max-w-[46ch] font-body text-[clamp(16px,calc(15.046px+0.254vw),17px)] leading-[1.6] text-hls-platinum/75">
            For CA Final Group 1 repeaters preparing for May 2027. Financial Reporting, Advanced
            Financial Management and Audit, with one-to-one attention to how you prepare and perform.
            Built on our five-step framework: mindset, routine, learning, revision and practice.
          </p>
          <p className="mt-6 max-w-[46ch] border-t border-hls-mist/15 pt-5 font-body text-[15px] leading-[1.6] text-hls-mist">
            Discussed with a counsellor after your consultation, if it fits.
          </p>
          <div className="mt-auto pt-10">
            <MagnetLink
              href={LANDING_URL}
              aria-describedby="story-ways-programme"
              className={OUTLINE}
            >
              <span>See the details</span>
              <OutlineArrow />
            </MagnetLink>
          </div>
        </article>
      </div>
    </section>
  );
}
