'use client';

import { useEffect, useRef } from 'react';
import { initGsap, reducedMotion } from '@/lib/motion';

const SENTENCES = [
  'Every six months, tens of thousands of students walk into the CA Final exam.',
  'Between eleven and nineteen percent of them clear.',
  'The material was not the problem.',
  'Not this time. Not last time. Not the time before that.',
];

export default function Problem() {
  const section = useRef(null);
  const stack = useRef(null);
  const items = useRef([]);
  const stat = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      const els = items.current.filter(Boolean);
      const stackEl = stack.current;

      // Vertical offset that parks sentence i on the centre line.
      const targetY = (i) => {
        const el = els[i];
        if (!el || !stackEl) return 0;
        const centre = el.offsetTop + el.offsetHeight / 2;
        return stackEl.offsetHeight / 2 - centre;
      };

      gsap.set(stackEl, { y: () => targetY(0) });
      gsap.set(els, { opacity: 0, y: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      els.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.55 }, i);
        if (i > 0) {
          tl.to(els[i - 1], { opacity: 0.2, duration: 0.5 }, i);
          tl.to(stackEl, { y: () => targetY(i), duration: 0.8, ease: 'power2.inOut' }, i);
        }
      });

      // Final beat, the stat takes the viewport.
      tl.to(els, { opacity: 0, duration: 0.45 }, 4)
        .fromTo(
          stat.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
          4.05
        )
        .to({}, { duration: 0.5 });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="reality"
      className="rm-flow rm-pad relative h-[100svh] w-full overflow-hidden bg-hls-black"
    >
      <span className="kicker absolute left-5 top-[92px] z-20 text-hls-mist md:left-10 md:top-[108px]">
        02 · The Reality
      </span>

      <div className="rm-flow absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1180px] px-5 md:px-10">
          <div ref={stack} className="will-change-transform">
            {SENTENCES.map((s, i) => (
              <p
                key={i}
                ref={(el) => {
                  items.current[i] = el;
                }}
                className="display js-fade mb-10 text-[clamp(32px,4.5vw,56px)] leading-[1.1] text-hls-platinum last:mb-0 md:mb-14"
              >
                {s}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={stat}
        className="js-fade rm-flow pointer-events-none absolute inset-0 mt-0 flex flex-col items-center justify-center px-5 text-center [@media(prefers-reduced-motion:reduce)]:mt-24"
      >
        <span className="display block text-[clamp(72px,min(20vw,34vh),320px)] leading-[0.9] text-hls-signal">
          11&#8211;19%
        </span>
        <span className="kicker mt-8 block text-hls-mist md:mt-10">
          CA Final pass rates, last five attempt cycles
        </span>
      </div>
    </section>
  );
}
