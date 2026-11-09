'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Photo from '@/components/Photo';
import WordReveal, { toWords } from '@/components/WordReveal';
import { initGsap, reducedMotion } from '@/lib/motion';
import StoryCta from './StoryCta';

const HEADLINE = [toWords('Before another attempt, find out why.')];

export default function StoryClose() {
  const section = useRef(null);
  const headline = useRef(null);
  const rest = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const ctx = gsap.context(() => {
      const words = headline.current.querySelectorAll('.js-word-inner');
      gsap.set(rest.current, { opacity: 0, y: 16 });
      const tl = gsap
        .timeline({ paused: true })
        .fromTo(words, { y: 0, yPercent: 115 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 })
        .to(rest.current, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '<0.5');

      // Plays once, however the visitor arrives.
      let played = false;
      const play = (self) => {
        if (played) return;
        played = true;
        tl.play();
        self.kill();
      };
      ScrollTrigger.create({
        trigger: headline.current,
        start: 'top 80%',
        onEnter: play,
        onLeave: play,
        onRefresh: (self) => {
          if (self.progress > 0) play(self);
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="story-close"
      className="relative isolate flex min-h-[100svh] w-full flex-col items-center bg-hls-black px-5 pb-[clamp(72px,12vh,120px)] pt-[clamp(120px,18vh,180px)] text-center md:px-10"
    >
      <Photo
        src="/photos/hall-dawn.png"
        className="absolute inset-0 -z-10 opacity-70 [filter:url(#hls-duotone)]"
      />
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div ref={headline}>
          <WordReveal as="h2" mode="manual" lines={HEADLINE} className="scene-line max-w-[14em] text-hls-platinum" />
        </div>

        <div ref={rest} className="mt-[clamp(32px,6vh,56px)] w-full">
          <StoryCta primary />
        </div>
      </div>
    </section>
  );
}
