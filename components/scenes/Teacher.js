'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import WordReveal, { toWords } from '@/components/WordReveal';
import { afterFirstInput, initGsap, reducedMotion } from '@/lib/motion';

const NAME = [toWords('Himakanth Andhavarapu, CA.')];

const PRIORITY = 2;

/** Where the flood starts, roughly where the spark sat a screen ago. */
const ORIGIN = '50% 42%';

export default function Teacher() {
  const section = useRef(null);
  const blue = useRef(null);
  const platinum = useRef(null);
  const portrait = useRef(null);
  const name = useRef(null);
  const line = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const el = section.current;

    // The panel is platinum by default, for reduced motion and no-JS. Here
    // it starts black and only tells the nav it is light once the platinum
    // has actually reached the top of the screen.
    let light = null;
    const setLight = (on) => {
      if (on === light) return;
      light = on;
      el.dataset.nav = on ? 'light' : 'dark';
      window.dispatchEvent(new Event('hls:nav'));
    };

    let ctx;
    const cancel = afterFirstInput(PRIORITY, () => {
      ctx = gsap.context(() => {
        setLight(false);
        gsap.set([blue.current, platinum.current], { clipPath: `circle(0% at ${ORIGIN})` });
        gsap.set(portrait.current, { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(portrait.current.querySelector('img'), { scale: 1.12 });
        gsap.set(line.current, { opacity: 0, y: 16 });

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: '+=220%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            refreshPriority: PRIORITY,
          },
          // A plain function, the trigger can render before `tl` is assigned.
          // 1.75 is when the platinum circle clears the top corners.
          onUpdate() {
            setLight(this.time() >= 1.75);
          },
        });

        // Black, then Signal Blue, then platinum, each from the same point.
        tl.to(blue.current, { clipPath: `circle(90% at ${ORIGIN})`, duration: 1.3, ease: 'power2.in' }, 0)
          .to(
            platinum.current,
            { clipPath: `circle(90% at ${ORIGIN})`, duration: 1.3, ease: 'power2.in' },
            0.55
          )
          .to(portrait.current, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out' }, 1.7)
          .to(portrait.current.querySelector('img'), { scale: 1, duration: 1.2, ease: 'power2.out' }, 1.7)
          .fromTo(
            name.current.querySelectorAll('.js-word-inner'),
            { y: 0, yPercent: 115 },
            { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07 },
            2.0
          )
          .to(line.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 2.45)
          .to({}, { duration: 1 });
      }, el);
    });

    return () => {
      cancel();
      ctx?.revert();
      el.dataset.nav = 'light';
      window.dispatchEvent(new Event('hls:nav'));
    };
  }, []);

  return (
    <section
      ref={section}
      id="teacher"
      data-nav="light"
      className="cv-auto relative h-[100svh] w-full overflow-hidden bg-hls-black motion-reduce:h-auto"
    >
      <div ref={blue} className="rm-hide absolute inset-0 bg-hls-signal" />
      <div ref={platinum} className="absolute inset-0 bg-hls-platinum">
        <Image
          src="/campus.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover"
          // Texture, not a photograph. Blurred so no face or gown reads.
          style={{ opacity: 0.05, filter: 'grayscale(100%) blur(3px)' }}
        />
      </div>

      <div className="rm-pad relative mx-auto flex h-full w-full max-w-[1600px] flex-col justify-center gap-[clamp(28px,5vh,48px)] px-5 pt-[72px] text-hls-navy md:grid md:grid-cols-12 md:items-center md:gap-12 md:px-10 md:pt-[84px]">
        <div
          ref={portrait}
          className="relative aspect-[4/5] w-[min(62vw,34svh)] overflow-hidden md:col-span-5 md:w-full md:max-w-[min(440px,58svh)] lg:col-span-4 lg:col-start-2"
        >
          <Image
            src="/himakanth.jpg"
            alt="Himakanth Andhavarapu"
            fill
            sizes="(max-width: 767px) 62vw, 440px"
            className="object-cover object-[50%_35%]"
            style={{ filter: 'grayscale(100%) contrast(1.06)' }}
          />
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <div ref={name}>
            <WordReveal
              as="h2"
              mode="manual"
              lines={NAME}
              className="display text-[clamp(38px,min(4.6vw,8.5vh),76px)] leading-[1.02] [text-wrap:balance]"
            />
          </div>
          <p
            ref={line}
            className="mt-[clamp(16px,3vh,32px)] max-w-[30ch] font-body text-[clamp(17px,1.5vw,22px)] leading-[1.5] text-hls-navy/75"
          >
            Built HIM LIFE SCHOOL for students who knew the syllabus and still lost the marks.
          </p>
        </div>
      </div>
    </section>
  );
}
