'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { LANDING_URL } from '@/lib/motion';

function Arrow({ className = '' }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** The crest and one way forward. Nothing else. */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    // The bar sits over both black and platinum panels, so it reads the
    // panel directly underneath it and inverts. Scenes that flip a panel
    // mid-pin announce it with `hls:nav`, scroll alone would miss the flip.
    const band = 42;
    const check = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.85);
      const panels = document.querySelectorAll('[data-nav="light"]');
      let over = false;
      for (const el of panels) {
        const r = el.getBoundingClientRect();
        if (r.top <= band && r.bottom >= band) {
          over = true;
          break;
        }
      }
      setLight(over);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    window.addEventListener('hls:nav', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      window.removeEventListener('hls:nav', check);
    };
  }, []);

  const toTop = useCallback((e) => {
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo(0, 0);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-[80] border-b transition-[background-color,backdrop-filter,border-color] duration-500',
        scrolled
          ? light
            ? 'border-hls-navy/10 bg-hls-platinum/60 backdrop-blur-md'
            : 'border-hls-mist/15 bg-hls-black/55 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      <nav className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-5 md:h-[84px] md:px-10">
        <a
          href="#top"
          onClick={toTop}
          aria-label="HIM LIFE SCHOOL, back to top"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/hls_crest.png"
            alt="HIM LIFE SCHOOL"
            width={706}
            height={930}
            priority
            className="h-[30px] w-auto"
          />
        </a>

        <a
          href={LANDING_URL}
          className="group inline-flex items-center gap-2 whitespace-nowrap bg-hls-signal px-3.5 py-2.5 font-mono text-[11px] font-medium uppercase leading-[1.2] tracking-[0.14em] text-hls-black transition-opacity duration-300 hover:opacity-85 sm:text-[12px] sm:tracking-[0.22em] md:px-5"
        >
          <span>Find where yours breaks</span>
          <Arrow className="shrink-0 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </nav>
    </header>
  );
}
