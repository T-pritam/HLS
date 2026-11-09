'use client';

import { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initGsap, reducedMotion } from '@/lib/motion';
import { LAMP } from './LampGlow';

/**
 * The way into the founder scene (components/scenes/Teacher.js), which runs
 * its own timeline. As its pin begins: 200ms of black, then platinum floods
 * out from where the lamp stood. The overlay lifts once the scene's own
 * platinum has covered the screen (it says so through `hls:nav`), and resets
 * if the visitor scrolls back up.
 */
export default function StoryLampFlood() {
  const root = useRef(null);
  const sheet = useRef(null);

  useEffect(() => {
    const gsap = initGsap();
    if (reducedMotion()) return;

    const el = root.current;
    const teacher = document.getElementById('teacher');
    if (!teacher) return;

    const nav = (light) => {
      if (light) el.dataset.nav = 'light';
      else delete el.dataset.nav;
      window.dispatchEvent(new Event('hls:nav'));
    };

    let tl;
    const reset = () => {
      tl?.kill();
      gsap.set(el, { autoAlpha: 0 });
      gsap.set(sheet.current, { scale: 0 });
      nav(false);
    };
    const lift = () => {
      if (el.style.visibility === 'hidden' || teacher.dataset.nav !== 'light') return;
      tl?.kill();
      tl = gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'power1.out', onComplete: () => nav(false) });
    };
    const flood = () => {
      if (teacher.dataset.nav === 'light') return;
      tl?.kill();
      gsap.set(el, { autoAlpha: 1 });
      gsap.set(sheet.current, { scale: 0 });
      tl = gsap
        .timeline()
        .to({}, { duration: 0.2 })
        .add(() => nav(true))
        .to(sheet.current, { scale: 1, duration: 0.8, ease: 'power2.in' })
        .add(lift);
    };

    reset();
    const st = ScrollTrigger.create({
      trigger: teacher,
      start: 'top top',
      onEnter: flood,
      onLeaveBack: reset,
    });
    window.addEventListener('hls:nav', lift);

    return () => {
      st.kill();
      tl?.kill();
      window.removeEventListener('hls:nav', lift);
      delete el.dataset.nav;
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="rm-hide pointer-events-none fixed inset-0 z-[70] overflow-hidden bg-hls-black"
      style={{ visibility: 'hidden', opacity: 0 }}
    >
      {/* A platinum disc centred on the lamp, big enough to cover the screen
          from any corner. It grows by scale only. */}
      <div
        ref={sheet}
        className="absolute h-[300vmax] w-[300vmax] rounded-full bg-hls-platinum"
        style={{ left: LAMP.x, top: LAMP.y, margin: '-150vmax 0 0 -150vmax', transform: 'scale(0)' }}
      />
    </div>
  );
}
