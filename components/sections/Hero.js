'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CircuitField from '@/components/CircuitField';
import WordReveal from '@/components/WordReveal';
import { initGsap, reducedMotion } from '@/lib/motion';

const HEADLINE = [
  [{ text: 'The' }, { text: 'gap' }, { text: 'between' }],
  [{ text: 'knowing' }, { text: 'and' }, { text: 'scoring.' }],
];

export default function Hero() {
  const section = useRef(null);
  const bg = useRef(null);
  const content = useRef(null);
  const sub = useRef(null);
  const micro = useRef(null);
  const pulse = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      // Sub and micro CTA arrive once the headline has landed.
      gsap.to(sub.current, { opacity: 1, duration: 0.8, ease: 'expo.out', delay: 2.05 });
      gsap.to(micro.current, { opacity: 1, duration: 0.8, ease: 'expo.out', delay: 2.4 });

      // Scroll indicator, draws down then drains down, forever.
      gsap
        .timeline({ repeat: -1, delay: 2.6, defaults: { ease: 'power1.inOut' } })
        .fromTo(
          pulse.current,
          { scaleY: 0, transformOrigin: 'top center' },
          { scaleY: 1, duration: 1.1 }
        )
        .to(pulse.current, { transformOrigin: 'bottom center', duration: 0 })
        .to(pulse.current, { scaleY: 0, duration: 1.1 })
        .to({}, { duration: 0.35 });

      // Hero content lifts away over the first screen of scroll.
      gsap.to(content.current, {
        yPercent: -18,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Circuit field trails at half scroll speed.
      gsap.to(bg.current, {
        y: () => window.innerHeight * 0.5,
        ease: 'none',
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="hero"
      className="relative h-[100svh] min-h-[520px] w-full overflow-hidden bg-hls-black"
    >
      <div ref={bg} className="pointer-events-none absolute inset-0 opacity-15">
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

      <div
        ref={content}
        className="relative z-10 flex h-full flex-col items-center justify-center px-5 pb-[clamp(32px,6vh,64px)] pt-[clamp(96px,14vh,140px)] text-center"
      >
        <WordReveal
          as="h1"
          lines={HEADLINE}
          mode="load"
          delay={1.05}
          stagger={0.08}
          duration={0.9}
          className="display hero-headline text-hls-platinum"
        />

        <p
          ref={sub}
          className="js-fade mt-[clamp(20px,4vh,40px)] max-w-[540px] font-body text-[20px] font-medium leading-[1.45] text-hls-platinum/75 md:text-[24px]"
        >
          A CA Final mentorship in Hyderabad for students who are done losing marks they should
          have won.
        </p>

        <div
          ref={micro}
          className="js-fade mt-[clamp(28px,7vh,64px)] flex flex-col items-center gap-4"
        >
          <span className="kicker text-hls-mist">Scroll</span>
          <span className="relative block h-[clamp(40px,7vh,64px)] w-px overflow-hidden bg-hls-mist/20">
            <span ref={pulse} className="absolute inset-0 block bg-hls-signal" />
          </span>
        </div>
      </div>
    </section>
  );
}
