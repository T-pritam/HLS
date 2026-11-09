'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import WordReveal, { toWords } from '@/components/WordReveal';
import { initGsap, reducedMotion, warmFirstInput } from '@/lib/motion';

// Two lines, broken on purpose.
const HEADLINE = [toWords('You worked.'), toWords('You still don’t know why.')];

/** Your own desk, seen from your own chair. */
export default function StoryHero() {
  const section = useRef(null);
  const photo = useRef(null);
  const sub = useRef(null);
  const cue = useRef(null);
  const [missing, setMissing] = useState(false);

  // The founder scene below builds on the first input. Build it while the
  // browser is idle after load instead, so the first scroll has nothing to pay for.
  useEffect(() => {
    if (reducedMotion()) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    let id;
    let t;
    const later = () => {
      t = setTimeout(() => (id = idle(warmFirstInput, { timeout: 6000 })), 1200);
    };
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    return () => {
      window.removeEventListener('load', later);
      clearTimeout(t);
      if (id) cancel(id);
    };
  }, []);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(sub.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'expo.out', delay: 1.6 });
      gsap.fromTo(cue.current, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 2.2 });

      // A slow lean in towards the desk as you scroll.
      gsap.fromTo(
        photo.current,
        { scale: 1 },
        {
          scale: 1.06,
          ease: 'none',
          scrollTrigger: { trigger: section.current, start: 'top top', end: 'bottom top', scrub: true },
        }
      );

      // Scroll cue, draws down then drains down, forever.
      const bar = cue.current.firstChild;
      gsap
        .timeline({ repeat: -1, delay: 2.4, defaults: { ease: 'power1.inOut' } })
        .fromTo(bar, { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 1.1 })
        .set(bar, { transformOrigin: 'bottom center' })
        .to(bar, { scaleY: 0, duration: 1.1 })
        .to({}, { duration: 0.35 });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="story-hero"
      className="relative isolate flex h-[100svh] min-h-[520px] w-full items-end overflow-hidden bg-hls-black"
    >
      {/* The push-in scales this wrapper. The photo keeps its own colours,
          only lightly toned, and the filter never animates. A dark gradient
          shows if the photo is missing. */}
      <div ref={photo} className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#102030_0%,#000000_100%)]">
        {missing ? null : (
          <Image
            src="/photos/pov-desk.png"
            alt=""
            fill
            priority
            sizes="100vw"
            onError={() => setMissing(true)}
            // Phones crop to the right third, where the lamp and books are.
            className="object-cover object-[68%_50%] md:object-center"
            style={{ filter: 'saturate(0.7) brightness(1.05) contrast(1.05)' }}
          />
        )}
      </div>
      {/* Behind the copy only: from the left on wide screens, from the bottom
          on narrow ones. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_60%)] md:bg-[linear-gradient(to_right,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_55%)]"
      />
      {/* A faint vignette, edges only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.25)_100%)]"
      />
      {/* Keeps the nav readable over the lamp's highlight. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[160px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_100%)]"
      />

      <div className="story-frame mx-auto w-full max-w-[1400px] px-5 pb-[clamp(88px,17svh,180px)] md:px-10 lg:max-w-none lg:px-0">
        <WordReveal
          as="h1"
          lines={HEADLINE}
          mode="load"
          prerender
          delay={1.0}
          stagger={0.07}
          duration={1}
          lineClassName="whitespace-nowrap"
          className="display text-[clamp(30px,min(7.4vw,12vh),100px)] leading-[1.02] text-hls-platinum [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]"
        />
        <p ref={sub} className="mt-[clamp(16px,3vh,28px)] font-body text-[clamp(17px,1.5vw,21px)] text-hls-platinum/75">
          For CA Final Group 1 repeaters.
        </p>
      </div>

      <div ref={cue} aria-hidden="true" className="rm-hide absolute bottom-[clamp(20px,4vh,40px)] left-5 md:left-10">
        <span className="block h-[clamp(32px,5vh,52px)] w-px origin-top bg-hls-signal" />
      </div>
    </section>
  );
}
