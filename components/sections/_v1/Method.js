'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initGsap, reducedMotion } from '@/lib/motion';

// Archived with v1. lib/motion.js now exports LANDING_URL instead.
const WHATSAPP = 'https://wa.me/917075985970';

const FACETS = [
  {
    n: '01',
    kicker: '01 · WHAT TO STUDY',
    title: 'Not the whole syllabus. The parts that carry marks.',
    body: 'Precision beats coverage. We map the scoring topography of each paper and target the ground where marks actually live.',
    img: '/facet_01.jpeg',
  },
  {
    n: '02',
    kicker: '02 · HOW TO STUDY',
    title: 'Precision over hours. Repetition where it counts.',
    body: 'The number of hours you put in stopped being the variable a long time ago. What matters is what you do inside those hours.',
    img: '/facet_02.jpeg',
  },
  {
    n: '03',
    kicker: '03 · HOW TO RECALL',
    title: 'Memory that survives the exam hall.',
    body: 'Not the memory that works at your desk on a quiet afternoon. The memory that holds up under three hours of pressure, in a room full of strangers.',
    img: '/facet_03.jpeg',
  },
  {
    n: '04',
    kicker: '04 · HOW TO PRESENT',
    title: 'Structure, keywords, discipline. Marks are awarded, not assumed.',
    body: 'An examiner cannot give you marks for what you know. Only for what you write down, in the order and language the marking scheme rewards.',
    img: '/facet_04.jpeg',
  },
  {
    n: '05',
    kicker: '05 · HOW TO PERFORM UNDER PRESSURE',
    title: 'Three hours. One nervous system.',
    body: 'Twelve subjects of preparation, condensed into a single sitting. We train the nervous system, not just the notes.',
    img: '/facet_05.jpeg',
  },
];

const FADE = 'opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)';

// The #hls-ink filter moved to components/InkFilter.js and renders once in
// the layout.

/**
 * The tinted illustration, shown whole. Contained rather than cropped, so no
 * edge of the artwork is ever cut. Positioning is left entirely to the caller
 * so the stacked and standalone uses never fight over the same property.
 */
function Facet({ src, className = '', style }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={style}>
      <div className="relative h-[85%] w-[85%]">
        <Image
          src={src}
          alt=""
          aria-hidden="true"
          fill
          loading="lazy"
          sizes="(max-width: 767px) 320px, 480px"
          className="object-contain"
          style={{ filter: 'url(#hls-ink)' }}
        />
      </div>
    </div>
  );
}

export default function Method() {
  const section = useRef(null);
  const blocks = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      blocks.current.filter(Boolean).forEach((block, i) => {
        ScrollTrigger.create({
          trigger: block,
          start: 'top 40%',
          end: 'bottom 40%',
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="method"
      data-nav="light"
      className="relative w-full bg-hls-platinum px-5 py-24 text-hls-navy md:px-10 md:py-32"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Intro */}
        <div>
          <div className="flex items-center gap-5">
            <span className="kicker text-hls-signal">04 · The Method</span>
            <span className="block h-px w-[60px] bg-hls-signal" />
          </div>
          <h2 className="mt-10 font-display text-[clamp(38px,5vw,64px)] font-bold leading-[1.02] tracking-[-0.02em] md:mt-14">
            Five facets of
            <br />
            exam performance.
          </h2>
          <p className="mt-8 max-w-[420px] font-body text-[17px] leading-[1.6] text-hls-slate md:text-[18px]">
            All five, worked on separately. Scroll to move through them.
          </p>
        </div>

        {/* Sticky panel beside the scrolling text */}
        <div className="mt-20 md:mt-28 md:grid md:grid-cols-[2fr_3fr] md:gap-16 lg:gap-24">
          <div className="rm-hide hidden md:block">
            <div className="sticky top-[120px]">
              {/* Square, but never taller than the space under the nav. */}
              <div className="flex aspect-square w-[min(100%,480px,calc(100svh-180px))] overflow-hidden rounded-lg bg-hls-navy p-[60px]">
                <div className="relative w-full">
                  {FACETS.map((f, i) => (
                    <Facet
                      key={f.n}
                      src={f.img}
                      className="absolute inset-0"
                      style={{ opacity: active === i ? 1 : 0, transition: FADE }}
                    />
                  ))}

                  {/* Sixth slide, the panel empties out and points forward */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center font-display text-[64px] font-bold leading-none text-hls-signal"
                    style={{ opacity: active === FACETS.length ? 0.4 : 0, transition: FADE }}
                  >
                    &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {FACETS.map((f, i) => (
              <article
                key={f.n}
                ref={(el) => {
                  blocks.current[i] = el;
                }}
                className="flex min-h-[80vh] flex-col justify-center py-10 md:py-0"
              >
                {/* On narrow viewports the illustration leads its own block */}
                <div className="rm-show mx-auto mb-10 w-full max-w-[320px] rounded-lg bg-hls-navy p-8 md:hidden">
                  <Facet src={f.img} className="relative aspect-square w-full" />
                </div>

                <div className="max-w-[480px]">
                  <p className="kicker text-hls-signal">{f.kicker}</p>
                  <span className="mt-3 block h-[2px] w-[40px] bg-hls-signal" />
                  <h3 className="mt-8 font-display text-[clamp(32px,4vw,56px)] font-bold leading-[1.1] tracking-[-0.02em] text-hls-navy">
                    {f.title}
                  </h3>
                  <p className="mt-6 font-body text-[18px] font-normal leading-[1.6] text-hls-slate">
                    {f.body}
                  </p>
                </div>
              </article>
            ))}

            {/* Sixth slide, the last item in the sequence */}
            <article
              ref={(el) => {
                blocks.current[FACETS.length] = el;
              }}
              className="flex min-h-[80vh] flex-col justify-center py-10 md:py-0"
            >
              <div className="max-w-[480px]">
                <p className="kicker text-hls-signal">06 · THE INVITATION</p>
                <span className="mt-3 block h-[2px] w-[40px] bg-hls-signal" />
                <h3 className="mt-8 font-display text-[clamp(32px,4vw,56px)] font-bold leading-[1.1] tracking-[-0.02em] text-hls-navy">
                  Ready when you are.
                </h3>
                <p className="mt-6 font-body text-[18px] font-normal leading-[1.6] text-hls-slate">
                  The first conversation costs nothing. It also decides everything.
                </p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-10 inline-flex items-center gap-2 rounded bg-hls-signal px-7 py-[18px] font-mono text-[13px] font-medium uppercase leading-none tracking-[0.15em] text-hls-black transition-colors duration-300 hover:bg-hls-deep"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  <span>Start the conversation</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
