'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initGsap, reducedMotion } from '@/lib/motion';

/**
 * Lenis smooth scroll for the whole page, wired into the GSAP ticker so
 * ScrollTrigger stays in sync. Disabled entirely under reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const gsap = initGsap();

    // A pinned long-scroll page must always open at the top, browser scroll
    // restoration lands the visitor mid-timeline.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    if (reducedMotion()) {
      // Native scrolling only. Anchor links fall back to CSS smooth scroll.
      document.documentElement.style.scrollBehavior = 'auto';
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.6,
    });

    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Pin spacers change the document height after Lenis has measured it.
    // Without this its scroll limit stays at the pre-pin value and any
    // programmatic scrollTo past that point is clamped away.
    const resize = () => lenis.resize();
    ScrollTrigger.addEventListener('refresh', resize);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    // Swapped-in webfonts reflow the copy that unpinned triggers measure.
    document.fonts?.ready.then(refresh);
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener('refresh', resize);
      window.removeEventListener('load', refresh);
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}
