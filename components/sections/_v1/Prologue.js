'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MaskLines from '@/components/MaskLines';
import { initGsap, reducedMotion } from '@/lib/motion';

const LINES = [
  'HIM LIFE SCHOOL is a mentorship for repeat-attempt CA Final students.',
  'Based in Hyderabad.',
  'Built around one idea: the material was never the problem.',
];

export default function Prologue() {
  const section = useRef(null);
  const kicker = useRef(null);
  const rule = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section.current, start: 'top 72%', once: true },
      });

      tl.fromTo(
        kicker.current,
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out' }
      ).fromTo(
        rule.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: 'expo.out' },
        '-=0.45'
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="prologue"
      data-nav="light"
      className="relative flex min-h-[60vh] w-full items-center overflow-hidden bg-hls-platinum px-5 pb-[100px] pt-[120px] text-hls-navy md:px-10 md:pb-[140px] md:pt-[160px]"
    >
      {/* Campus, barely there. Atmosphere behind the copy, never competing. */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <Image
          src="/campus.png"
          alt=""
          aria-hidden="true"
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover"
          style={{ opacity: 0.08, filter: 'grayscale(100%)' }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1600px]">
        <div className="max-w-[800px]">
          <div className="flex items-center gap-5">
            <span ref={kicker} className="kicker js-fade text-hls-signal">
              01 · Prologue
            </span>
            <span ref={rule} className="js-rule block h-px w-[60px] bg-hls-signal" />
          </div>

          <MaskLines
            lines={LINES}
            className="mt-12 font-display text-[clamp(26px,3.6vw,40px)] font-semibold leading-[1.3] tracking-[-0.015em] md:mt-16"
            lineClassName="pb-[0.06em]"
            stagger={0.15}
            duration={1.1}
            start="top 76%"
          />
        </div>
      </div>
    </section>
  );
}
