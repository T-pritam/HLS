'use client';

import { useEffect, useRef } from 'react';
import MaskLines from '@/components/MaskLines';
import { initGsap, reducedMotion } from '@/lib/motion';

const BODY = [
  'What to study. How to study. How to recall.',
  'How to present. How to perform under pressure.',
  'Five separate skills. Most preparation covers one.',
];

function Chars({ word, className = '', innerClass = '' }) {
  return (
    <span className={className}>
      {word.split('').map((c, i) => (
        <span key={i} className={`inline-block ${innerClass}`}>
          {c}
        </span>
      ))}
    </span>
  );
}

export default function Shift() {
  const section = useRef(null);
  const lineOne = useRef(null);
  const lineTwo = useRef(null);
  const rule = useRef(null);
  const body = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(section);
      const knowledge = q('.js-knowledge');
      const execution = q('.js-execution');
      const baseOne = q('.js-base-one');
      const baseTwo = q('.js-base-two');
      const bodyLines = body.current.querySelectorAll('.js-mask');

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // The old word comes apart, character by character.
      tl.to(
        knowledge,
        { opacity: 0, y: -14, duration: 0.9, ease: 'power2.in', stagger: { amount: 1.5 } },
        0
      );

      // What is left of the first sentence clears out.
      tl.to(baseOne, { opacity: 0, duration: 1, ease: 'power2.inOut' }, 2.2);

      // A hairline marks the pivot.
      tl.fromTo(
        rule.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1, ease: 'expo.out' },
        2.8
      );

      // The second sentence assembles, then the new word types itself in.
      tl.to(baseTwo, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 3.8);
      tl.to(execution, { opacity: 1, duration: 0.12, stagger: { amount: 2.2 } }, 4.4);

      // Body copy lands once the shift has settled.
      tl.to(
        bodyLines,
        {
          clipPath: 'inset(0 0 -10% 0)',
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.25,
        },
        7.1
      );

      tl.to({}, { duration: 1.2 });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="shift"
      className="rm-flow rm-pad relative h-[100svh] w-full overflow-hidden bg-hls-black"
    >
      <span className="kicker absolute left-5 top-[92px] z-20 text-hls-mist md:left-10 md:top-[108px]">
        03 · The Shift
      </span>

      <div className="rm-flow flex h-full w-full flex-col items-center justify-center px-5 pt-[104px] md:px-10 md:pt-0">
        <div className="shift-stack grid w-full max-w-[1200px] place-items-center">
          <h2
            ref={lineOne}
            className="statement col-start-1 row-start-1 text-center text-hls-platinum"
          >
            <span className="js-base-one">This is not a </span>
            <Chars word="knowledge" innerClass="js-knowledge" />
            <span className="js-base-one"> problem.</span>
          </h2>

          <p
            ref={lineTwo}
            className="statement col-start-1 row-start-1 text-center text-hls-platinum"
          >
            <span className="js-base-two js-fade">It is an </span>
            <Chars
              word="execution"
              className="text-hls-signal"
              innerClass="js-execution js-fade"
            />
            <span className="js-base-two js-fade"> problem.</span>
          </p>
        </div>

        <span
          ref={rule}
          className="js-rule mt-12 block h-px w-[120px] bg-hls-signal md:mt-16"
          style={{ transformOrigin: 'center' }}
        />

        <div ref={body} className="mt-12 md:mt-16">
          <MaskLines
            lines={BODY}
            auto={false}
            className="max-w-[640px] text-center font-body text-[17px] font-medium leading-[1.6] text-hls-platinum/75 md:text-[20px]"
          />
        </div>
      </div>
    </section>
  );
}
