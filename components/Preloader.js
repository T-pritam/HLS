'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { initGsap, reducedMotion } from '@/lib/motion';

/**
 * Black screen, crest fades in, brief hold, fade out. 1.2s total.
 * Skipped under reduced motion, the overlay is hidden by CSS in that case
 * so there is no flash before this effect runs.
 */
export default function Preloader() {
  const root = useRef(null);
  const crest = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const gsap = initGsap();

    if (reducedMotion()) {
      setDone(true);
      return;
    }

    document.documentElement.style.overflow = 'hidden';

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.style.overflow = '';
        setDone(true);
      },
    });

    tl.fromTo(
      crest.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }
    )
      .to({}, { duration: 0.35 })
      .to(root.current, { opacity: 0, duration: 0.4, ease: 'expo.out' });

    return () => {
      tl.kill();
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (done) return null;

  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div ref={crest} className="preloader-crest">
        <Image
          src="/hls_crest.png"
          alt=""
          width={706}
          height={930}
          priority
          className="h-[64px] w-auto"
        />
      </div>
    </div>
  );
}
