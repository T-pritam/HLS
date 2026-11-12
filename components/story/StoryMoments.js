'use client';

import { useEffect, useRef } from 'react';
import Photo from '@/components/Photo';
import { initGsap, pinLength, staticScenes } from '@/lib/motion';
import { HallSheet, Marksheet } from './DeskObjects';
import LampGlow from './LampGlow';

const MOMENTS = [
  {
    key: 'near-miss',
    Item: Marksheet,
    captions: ['You add it up again.', 'Still 132.', 'Every paper above 40. The group needs 150.'],
  },
  {
    key: 'hall',
    Item: HallSheet,
    captions: ['You knew this one.', 'Your hand couldn’t keep up.', 'Time.'],
  },
];

const CAPTION = 'font-display text-[clamp(30px,min(4.6vw,8vh),68px)] italic leading-[1.1] tracking-[-0.015em] text-hls-platinum [text-wrap:balance]';

const pad = (n) => String(n).padStart(2, '0');

/** The near miss and the hall. One stage, scrubbed. The not knowing is StoryFilter. */
export default function StoryMoments() {
  const section = useRef(null);
  const captions = useRef(null);
  const objects = useRef(null);
  const hall = useRef(null);
  const dim = useRef(null);
  const lamp = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (staticScenes()) return;

    const ctx = gsap.context(() => {
      const caps = [...captions.current.children];
      const views = [...objects.current.children];
      const q = gsap.utils.selector(objects);
      const ticks = q('[data-ticks]');
      const total = q('[data-total]')[0];
      const totalLine = q('[data-total-line]');
      const need = q('[data-need]');
      const clock = q('[data-clock]')[0];
      const pen = q('[data-pen]');
      const barFill = q('[data-bar-fill]');
      const barGap = q('[data-bar-gap]');

      gsap.set(caps.slice(1), { autoAlpha: 0, y: 16 });
      gsap.set(views.slice(1), { autoAlpha: 0 });
      gsap.set(hall.current, { opacity: 0 });

      // Counters write straight into the text, whole numbers only.
      const count = { total: 132, clock: 240 };
      const paint = () => {
        total.textContent = String(Math.round(count.total));
        const s = Math.max(0, Math.round(count.clock));
        clock.textContent = `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: paint,
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: pinLength(270, 170),
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          // Above the imported Teacher (2): this pin sits higher on the page,
          // so it has to be measured first.
          refreshPriority: 10,
        },
      });

      let shown = 0;
      const caption = (i, at) => {
        tl.to(caps[shown], { autoAlpha: 0, y: -16, duration: 0.25 }, at).to(
          caps[i],
          { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
          at + 0.2
        );
        shown = i;
      };
      // The room goes dark for a beat between moments.
      const swap = (from, to, at) => {
        tl.to(dim.current, { opacity: 0.9, duration: 0.3 }, at)
          .set(views[from], { autoAlpha: 0 }, at + 0.3)
          .set(views[to], { autoAlpha: 1 }, at + 0.3)
          .to(dim.current, { opacity: 0, duration: 0.35 }, at + 0.4);
      };

      // A. The near miss.
      tl.to(ticks, { strokeDashoffset: 0, duration: 1.0, ease: 'power1.inOut' }, 0.3)
        .fromTo(count, { total: 0 }, { total: 132, duration: 0.5 }, 1.4)
        .fromTo(count, { total: 0 }, { total: 132, duration: 0.5, immediateRender: false }, 2.0);
      // The bar grows with the recount and stops short. The missing 18 pulse.
      tl.to(barFill, { scaleX: 1, duration: 1.1, ease: 'power1.out' }, 1.4).to(
        barGap,
        { keyframes: { opacity: [1, 0.3, 1], scaleY: [1, 1.6, 1] }, duration: 0.4 },
        2.55
      );
      caption(1, 2.5);
      tl.to(totalLine, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 2.9).to(
        need,
        { opacity: 1, duration: 0.3 },
        3.3
      );
      caption(2, 3.7);

      // B. The hall.
      swap(0, 1, 5.0);
      tl.to(hall.current, { opacity: 1, duration: 0.6 }, 5.2);
      caption(3, 5.3);
      tl.fromTo(count, { clock: 240 }, { clock: 0, duration: 3.8, immediateRender: false }, 5.6).to(
        pen,
        { strokeDashoffset: 0, duration: 1.2, ease: 'power1.in' },
        6.2
      );
      // The lamp stutters while the clock runs out.
      tl.to(
        lamp.current,
        { keyframes: { opacity: [1, 0.55, 0.95, 0.7, 1, 0.4, 0.85, 0.6, 0.92, 0.35, 0.8] }, duration: 3.8 },
        5.6
      );
      caption(4, 7.2);
      caption(5, 9.3);

      tl.to({}, { duration: 1.2 });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={section}
      id="story-moments"
      className="rm-flow rm-pad relative isolate h-[100svh] w-full overflow-hidden bg-hls-black"
    >
      <Photo src="/photos/pov-desk.png" className="rm-hide absolute inset-0 -z-10 opacity-25 [filter:url(#hls-duotone)]" />
      <div ref={hall} className="rm-hide absolute inset-0 -z-10 opacity-0">
        <Photo src="/photos/hero-hall.png" className="absolute inset-0 opacity-45 [filter:url(#hls-duotone)]" />
      </div>
      <LampGlow glowRef={lamp} className="rm-hide -z-10" />
      <span ref={dim} className="rm-hide pointer-events-none absolute inset-0 z-20 bg-black opacity-0" />

      {/* With motion: one stage, captions and objects each stacked in place. */}
      <div className="rm-hide mx-auto flex h-full w-full max-w-[1400px] flex-col items-center gap-6 px-5 pb-6 pt-[96px] md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-16 md:px-10 md:pb-0 md:pt-[84px]">
        <div ref={captions} className="grid w-full self-start md:self-center">
          {MOMENTS.flatMap((m) => m.captions).map((c) => (
            <p key={c} className={`col-start-1 row-start-1 max-w-[13em] ${CAPTION}`}>
              {c}
            </p>
          ))}
        </div>
        <div ref={objects} className="grid flex-1 place-items-center md:flex-none">
          {MOMENTS.map(({ key, Item }) => (
            <div key={key} className="col-start-1 row-start-1">
              <Item />
            </div>
          ))}
        </div>
      </div>

      {/* Without motion: each moment as its own static card. */}
      <div className="hidden rm-show mx-auto w-full max-w-[1400px] px-5 md:px-10">
        {MOMENTS.map(({ key, Item, captions: lines }) => (
          <div key={key} className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              {lines.map((c) => (
                <p key={c} className={`max-w-[14em] ${CAPTION}`}>
                  {c}
                </p>
              ))}
            </div>
            <div className="self-center">
              <Item settled />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
