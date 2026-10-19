'use client';

import { useEffect, useRef } from 'react';
import Photo from '@/components/Photo';
import WordReveal, { toWords } from '@/components/WordReveal';
import { afterFirstInput, initGsap, reducedMotion } from '@/lib/motion';

const LINE_ONE = [toWords('Somewhere in those five, yours is breaking.')];
const LINE_TWO = [toWords('Finding it is the first step.', true)];

const PRIORITY = 3;

export default function Turn() {
  const section = useRef(null);
  const spark = useRef(null);
  const one = useRef(null);
  const two = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    let ctx;
    const cancel = afterFirstInput(PRIORITY, () => {
      ctx = gsap.context(() => {
        const q = gsap.utils.selector(spark);
        const core = q('.spark-core');
        const glow = q('.spark-glow');
        const rays = q('.spark-ray');

        gsap.set(core, { opacity: 0 });
        gsap.set(glow, { opacity: 0, scale: 0.2 });
        gsap.set(rays, { opacity: 0, scale: 0 });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
          },
        });

        // One spark catches.
        tl.to(core, { keyframes: { opacity: [0, 1, 0.2, 1, 0.4, 1] }, duration: 0.9 }, 0)
          .to(glow, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.2)
          .to(rays, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, 0.35)
          .fromTo(
            one.current.querySelectorAll('.js-word-inner'),
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 },
            0.8
          )
          // and holds, a little brighter, as the second line arrives.
          .to(glow, { scale: 1.5, duration: 1, ease: 'power2.inOut' }, 2.4)
          .to(q('.spark-ray-h'), { scaleX: 1.6, duration: 1, ease: 'power2.inOut' }, 2.4)
          .fromTo(
            two.current.querySelectorAll('.js-word-inner'),
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 },
            2.6
          )
          .to({}, { duration: 1 });
      }, section);
    });

    return () => {
      cancel();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={section}
      id="turn"
      className="cv-auto rm-pad relative isolate flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-hls-black px-5 text-center md:px-10 motion-reduce:h-auto"
    >
      {/* Behind the copy, which is in normal flow. */}
      <Photo src="/photos/two-chairs.png" className="absolute inset-0 -z-10 opacity-50" />
      {/* The lit sheet on the table lands behind the copy, this pools it
          into shadow so the blue line stays readable. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_62%_40%_at_50%_60%,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0)_100%)]"
      />

      <div ref={spark} className="spark" aria-hidden="true">
        <span className="spark-glow" />
        <span className="spark-ray spark-ray-h" />
        <span className="spark-ray spark-ray-v" />
        <span className="spark-core" />
      </div>

      <div ref={one} className="mt-[clamp(56px,11vh,112px)]">
        <WordReveal
          as="p"
          mode="manual"
          lines={LINE_ONE}
          className="scene-line max-w-[14em] text-hls-platinum"
        />
      </div>
      <div ref={two} className="mt-[clamp(16px,3vh,32px)]">
        <WordReveal as="p" mode="manual" lines={LINE_TWO} className="scene-line max-w-[14em]" />
      </div>
    </section>
  );
}
