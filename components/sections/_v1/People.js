'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import MaskLines from '@/components/MaskLines';
import { initGsap, reducedMotion } from '@/lib/motion';

// The numbers carry the accent, the connective tissue stays quiet.
const ROOM = [
  { text: 'Fifteen', accent: true },
  { text: ' students per residential cohort. ' },
  { text: 'Six', accent: true },
  { text: ' resident Chartered Accountants, ' },
  { text: 'one', accent: true },
  { text: ' doctor, ' },
  { text: 'one', accent: true },
  { text: ' IITian. ' },
  { text: 'One', accent: true },
  { text: ' mentor for every student, when it matters.' },
];

const TESTIMONIAL = [
  [{ text: 'Twelve', accent: true }, { text: ' failed attempts.' }],
  [{ text: 'Cleared on the ' }, { text: 'thirteenth', accent: true }, { text: '.' }],
  [{ text: 'With HLS.' }],
];

export default function People() {
  const section = useRef(null);
  const portrait = useRef(null);
  const heading = useRef(null);
  const room = useRef(null);
  const strip = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      const rise = (el, start = 'top 85%') =>
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start, once: true },
          }
        );

      rise(heading.current);
      rise(room.current);
      rise(portrait.current);

      // The campus strip opens outward from its own centre line.
      gsap.fromTo(
        strip.current,
        { clipPath: 'inset(0 50% 0 50%)' },
        {
          clipPath: 'inset(0 0% 0 0%)',
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: { trigger: strip.current, start: 'top 88%', once: true },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="people"
      className="relative w-full bg-hls-black px-5 py-20 text-hls-platinum md:px-10 md:py-28"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center gap-5">
          <span className="kicker text-hls-signal">05 · The People</span>
          <span className="block h-px w-[60px] bg-hls-signal" />
        </div>

        <h2 ref={heading} className="section-title mt-8 max-w-[14ch] md:mt-10">
          The room this happens in.
        </h2>

        {/* The room, stated as a sentence rather than a scoreboard */}
        <p
          ref={room}
          className="mt-14 max-w-[24ch] font-display text-[clamp(24px,3vw,36px)] font-semibold leading-[1.3] tracking-[-0.015em] text-hls-platinum md:mt-20 md:max-w-[30ch]"
        >
          {ROOM.map((t, i) => (
            <span key={i} className={t.accent ? 'text-hls-signal' : undefined}>
              {t.text}
            </span>
          ))}
        </p>

        {/* Block A, the founder */}
        <div className="mt-16 grid grid-cols-1 gap-10 border-t border-hls-mist/15 pt-12 md:mt-24 md:grid-cols-12 md:gap-12 md:pt-16">
          <div ref={portrait} className="md:col-span-5">
            <Image
              src="/himakanth.jpg"
              alt="Himakanth Andhavarapu"
              width={1080}
              height={1080}
              loading="lazy"
              sizes="380px"
              className="h-auto w-full max-w-[380px]"
              style={{ filter: 'grayscale(30%) contrast(1.1)' }}
            />
          </div>

          <div className="md:col-span-6 md:col-start-7 md:self-center">
            <h3 className="font-display text-[24px] font-semibold leading-[1.2] tracking-[-0.01em]">
              The teacher.
            </h3>
            <p className="mt-5 max-w-[520px] font-body text-[16px] leading-[1.6] text-hls-platinum/70">
              HIM LIFE SCHOOL was founded by Himakanth Andhavarapu, a Chartered Accountant who
              spent years watching bright students fail an exam they knew the syllabus of. His
              response was to build a school that treats CA Final as a performance problem, not a
              syllabus problem.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-16 flex justify-center md:mt-24">
          <span className="block h-px w-[60px] bg-hls-signal" />
        </div>

        {/* Block B, the proof. Typography is the whole visual. */}
        <div className="mt-16 md:mt-24">
          <span className="kicker text-hls-mist">The proof</span>
          <MaskLines
            as="blockquote"
            lines={TESTIMONIAL}
            className="mt-8 font-display text-[clamp(32px,4vw,64px)] font-bold leading-[1.08] tracking-[-0.02em] text-hls-platinum md:mt-10"
            lineClassName="pb-[0.06em]"
            stagger={0.16}
            duration={1.1}
            start="top 82%"
          />
          <p className="mt-8 font-mono text-[12px] font-normal uppercase tracking-[0.22em] text-hls-mist md:mt-10">
            Prashant Jha, CA Final 2025
          </p>
        </div>
      </div>

      {/* A breather before the invitation */}
      <div
        ref={strip}
        className="relative -mx-5 mt-16 h-[300px] md:-mx-10 md:mt-24"
      >
        <Image
          src="/campus.png"
          alt=""
          aria-hidden="true"
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover object-center"
          style={{ filter: 'grayscale(100%)', opacity: 0.6 }}
        />
      </div>
    </section>
  );
}
