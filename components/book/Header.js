'use client';

import { useEffect, useState } from 'react';
import Logo from './Logo';

/**
 * Sticky header. With `links`, shows them inline from md up and behind a menu
 * button below that. Clear space around the lockup is at least its "H".
 */
export default function Header({ ctaHref = '#book', showCta = true, links = [] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-hls-line bg-white/90 backdrop-blur">
      <div className="wrap flex min-h-16 items-center justify-between gap-4 py-1.5">
        <a href="/book" className="-m-2 block p-2" aria-label="HIM LIFE SCHOOL, Blueprint Consultation">
          <Logo tone="light" priority className="block w-[104px] sm:w-[120px] [&_img]:w-full" />
        </a>

        <nav aria-label="Page" className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] text-hls-muted no-underline hover:text-hls-ink">
              {l.label}
            </a>
          ))}
          {showCta && (
            <a href={ctaHref} className="btn-primary !min-h-11 !px-5 !py-2.5 !text-[15px]">
              Book consultation
            </a>
          )}
        </nav>

        {(links.length > 0 || showCta) && (
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-hls-line text-hls-ink md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="book-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        )}
      </div>

      {open && (
        <nav id="book-menu" aria-label="Page" className="border-t border-hls-line bg-white md:hidden">
          <ul className="wrap py-2">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-3 text-[17px] text-hls-ink no-underline">
                  {l.label}
                </a>
              </li>
            ))}
            {showCta && (
              <li className="pb-3 pt-2">
                <a href={ctaHref} onClick={() => setOpen(false)} className="btn-primary w-full">
                  Book your blueprint consultation
                </a>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
