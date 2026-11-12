'use client';

import { useEffect, useRef } from 'react';
import { initGsap, reducedMotion } from '@/lib/motion';

/** The four parts every blueprint has, each with its (blurred) lines of writing. */
const PARTS = [
  { head: 'Where you stand', lines: [92, 78, 54] },
  { head: 'The specific gaps', lines: [86, 64] },
  { head: 'What to fix first', lines: [95, 81, 40] },
  { head: 'Your next-step plan', lines: [88, 58] },
];

/** A sample blueprint, as a document. Its writing is grey bars, not words. */
export default function StoryBlueprint() {
  const section = useRef(null);
  const body = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        body.current.children,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: body.current, start: 'top 82%', once: true },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="story-blueprint"
      aria-labelledby="story-blueprint-label"
      className="relative w-full bg-hls-black px-5 pb-[clamp(96px,16vh,160px)] md:px-10 lg:px-0"
    >
      <div ref={body} className="story-frame mx-auto w-full max-w-[1200px] lg:max-w-none">
        <h2 id="story-blueprint-label" className="kicker text-hls-mist">
          What a blueprint looks like
        </h2>

        <article className="mt-8 w-full max-w-[640px] rounded-[4px] bg-hls-platinum px-6 py-8 text-hls-black shadow-[0_24px_60px_-30px_rgba(18,115,194,0.5)] md:px-10 md:py-11">
          <p className="meta text-hls-black/70">Sample · Illustrative</p>
          <h3 className="mt-3 font-display text-[clamp(26px,2.6vw,34px)] leading-[1.1] tracking-[-0.015em]">
            Score-improvement blueprint
          </h3>
          <div className="mt-8 space-y-7 border-t border-hls-black/15 pt-7">
            {PARTS.map((p, i) => (
              <div key={p.head}>
                <h4 className="flex items-baseline gap-3 font-body text-[clamp(16px,calc(15.046px+0.254vw),17px)] font-semibold leading-[1.3]">
                  <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-hls-deep">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {p.head}
                </h4>
                <div aria-hidden="true" className="mt-3 space-y-2.5 pl-8 [filter:blur(2.5px)]">
                  {p.lines.map((w, k) => (
                    <span key={k} className="block h-[9px] rounded-full bg-hls-black/20" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <p className="mt-5 max-w-[640px] font-body text-[15px] leading-[1.5] text-hls-platinum/80">
          Every blueprint is written for one student’s marks and mocks.
        </p>
      </div>
    </section>
  );
}
