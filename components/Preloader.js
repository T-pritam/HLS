'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { initGsap, reducedMotion } from '@/lib/motion';

/**
 * 1.8s. The crest fades in, one Signal Blue line draws across the screen
 * behind it, then the black parts along that line and the page shows
 * through. Skipped under reduced motion, the overlay is hidden by CSS in
 * that case so there is no flash before this effect runs.
 */
export default function Preloader() {
  const crest = useRef(null);
  const line = useRef(null);
  const top = useRef(null);
  const bottom = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const gsap = initGsap();

    if (reducedMotion()) {
      setDone(true);
      return;
    }

    document.documentElement.style.overflow = 'hidden';

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        document.documentElement.style.overflow = '';
        setDone(true);
      },
    });

    // Fade in 0.7s, hold 0.6s, out 0.5s. The fade in is CSS on the image
    // (.preloader-crest img) so it starts with the first paint, this timeline
    // runs on the same clock from 0. The crest fades fast at first so it is
    // nearly gone by the time the halves open behind it.
    tl.fromTo(
      line.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.75, ease: 'power3.inOut' },
      0.45
    )
      .to(crest.current, { opacity: 0, duration: 0.5, ease: 'power2.out' }, 1.3)
      .to(top.current, { yPercent: -100, duration: 0.4, ease: 'expo.inOut' }, 1.4)
      .to(bottom.current, { yPercent: 100, duration: 0.4, ease: 'expo.inOut' }, 1.4)
      .to(line.current, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 1.5);

    // Hydration holds the main thread for a few hundred ms after this effect
    // and the ticker does not smooth lag, so start two frames later. Join the
    // CSS fade where it has got to. On a slow device it may already be done,
    // the line still draws in full.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const fade = crest.current.querySelector('img').getAnimations?.()[0];
        const elapsed = fade ? Math.max(0, fade.currentTime ?? 0) / 1000 : 0;
        tl.play(Math.min(elapsed, 0.45));
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      tl.kill();
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (done) return null;

  return (
    <div className="preloader" aria-hidden="true">
      <div ref={top} className="preloader-half preloader-half-top" />
      <div ref={bottom} className="preloader-half preloader-half-bottom" />
      <span ref={line} className="preloader-line" />
      {/* The stylesheet centres the crest with margins sized for a 64px
          mark. At this size it fills the overlay and centres with flex. */}
      <div
        ref={crest}
        className="preloader-crest"
        style={{
          inset: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/hls_crest.png"
          alt=""
          width={706}
          height={930}
          priority
          className="h-[55svh] w-auto max-w-[80vw] object-contain"
        />
      </div>
    </div>
  );
}
