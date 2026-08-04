'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { WHATSAPP } from '@/lib/motion';

const LINKS = [
  { label: 'Method', href: '#method' },
  { label: 'People', href: '#people' },
  { label: 'Invitation', href: '#invitation' },
];

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

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The bar sits over both black and platinum sections, so it reads the
    // panel directly underneath it and inverts.
    const band = 42;
    const onScroll = () => {
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
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const lenis = typeof window !== 'undefined' ? window.__lenis : null;
    if (open) {
      lenis?.stop();
      document.documentElement.style.overflow = 'hidden';
    } else {
      lenis?.start();
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const goTo = useCallback((e, href) => {
    e.preventDefault();
    setOpen(false);
    const target = document.querySelector(href);
    if (!target) return;
    const lenis = window.__lenis;
    // Wait a frame so the overlay lock is released before scrolling. Resolve
    // the offset here rather than handing Lenis an element, pinned sections
    // sit inside spacers and element targets do not land reliably.
    requestAnimationFrame(() => {
      const y = target.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y, { duration: 1.4 });
      else window.scrollTo(0, y);
    });
  }, []);

  return (
    <>
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
        <nav className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between px-5 md:h-[84px] md:px-10">
          <a
            href="#top"
            onClick={(e) => goTo(e, '#top')}
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

          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={(e) => goTo(e, l.href)}
                  className={`kicker transition-colors duration-300 hover:text-hls-signal ${
                    light ? 'text-hls-navy/70' : 'text-hls-platinum/70'
                  }`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="kicker group inline-flex items-center gap-2 bg-hls-signal px-4 py-2.5 text-hls-black transition-opacity duration-300 hover:opacity-85 md:px-5"
            >
              <span>WhatsApp</span>
              <Arrow className="transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="flex h-8 w-8 flex-col items-center justify-center gap-[6px] md:hidden"
            >
              <span
                className={`block h-px w-5 transition-transform duration-[400ms] ${light ? 'bg-hls-navy' : 'bg-hls-platinum'}`}
                style={{
                  transform: open ? 'translateY(3.5px) rotate(45deg)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              <span
                className={`block h-px w-5 transition-transform duration-[400ms] ${light ? 'bg-hls-navy' : 'bg-hls-platinum'}`}
                style={{
                  transform: open ? 'translateY(-3.5px) rotate(-45deg)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile panel */}
      <div
        className={[
          'fixed inset-0 z-[70] bg-hls-black transition-opacity duration-500 md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col justify-between px-5 pb-12 pt-[112px]">
          <ul className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={(e) => goTo(e, l.href)}
                  tabIndex={open ? 0 : -1}
                  className="display block py-3 text-[40px] text-hls-platinum"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="meta text-hls-mist">
            <p>HYDERABAD, INDIA</p>
            <p>+91 7075985970</p>
          </div>
        </div>
      </div>
    </>
  );
}
