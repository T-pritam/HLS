'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import PillLink from '@/components/ui/PillLink';
import { LANDING_URL } from '@/lib/motion';
import { CTA_LABEL } from '@/lib/story-facts';

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

  // On the home page the crest scrolls back to the top, anywhere else (the
  // 404 page) it goes home.
  const toTop = useCallback((e) => {
    if (window.location.pathname !== '/') return;
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
          href="/"
          onClick={toTop}
          aria-label="HIM LIFE SCHOOL, home"
          // At least 44px to tap; the crest keeps its size and place.
          className="flex min-h-11 min-w-11 shrink-0 items-center"
        >
          {/* 40px tall on phones, up to 60px on desktop; the bar's height is
              unchanged, so --nav-h stays as it is. */}
          <Image
            src="/hls_crest.png"
            alt="HIM LIFE SCHOOL"
            width={46}
            height={60}
            priority
            className="h-[40px] w-auto md:h-[clamp(44px,3.2vw,60px)]"
          />
        </a>

        {/* Navy over a light panel, Platinum everywhere else. */}
        <PillLink href={LANDING_URL} size="md" tone={light ? 'light' : 'dark'}>
          {CTA_LABEL}
        </PillLink>
      </nav>
    </header>
  );
}
