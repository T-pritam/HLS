'use client';

import { useEffect, useState } from 'react';

/** Mobile-only bar with the price and the one primary action. Hidden over the hero, pricing and the booking form. */
export default function StickyCta({ price, note }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = ['hero', 'pricing', 'book'].map((id) => document.getElementById(id)).filter(Boolean);
    if (!targets.length || !('IntersectionObserver' in window)) return;
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting);
      setShow(![...visible.values()].some(Boolean));
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hls-line bg-white/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-200 md:hidden ${
        show ? 'translate-y-0' : 'pointer-events-none invisible translate-y-full'
      }`}
      aria-hidden={!show}
    >
      <div className="wrap flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-[22px] leading-none">{price}</p>
          <p className="mt-1 truncate text-[13px] text-hls-muted">{note}</p>
        </div>
        <a href="#book" className="btn-primary !min-h-12 flex-none !px-5 !text-[16px]" tabIndex={show ? 0 : -1}>
          Book consultation
        </a>
      </div>
    </div>
  );
}
