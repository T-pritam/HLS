'use client';

import { useEffect, useState } from 'react';

/** Mobile-only bar with the one primary action. Hidden over the hero and the booking form. */
export default function StickyCta({ label }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = ['hero', 'book'].map((id) => document.getElementById(id)).filter(Boolean);
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
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hls-line bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden ${
        show ? '' : 'pointer-events-none invisible'
      }`}
      aria-hidden={!show}
    >
      <a href="#book" className="btn-primary w-full" tabIndex={show ? 0 : -1}>
        {label}
      </a>
    </div>
  );
}
