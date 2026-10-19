'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * A full-bleed photograph from public/photos. It dissolves into black at its
 * top and bottom edges so it joins the black sections around it. The dark
 * gradient underneath is all that is left when the file is missing.
 * The parent positions it, the wrapper must be absolute or relative.
 */
export default function Photo({
  src,
  className = '',
  position = '50% 50%',
  sizes = '100vw',
  priority = false,
}) {
  // ok: next/image serves it. raw: the optimiser failed but the file is
  // there, so show it unoptimised. missing: the file itself 404s.
  const [state, setState] = useState('ok');

  const onError = async () => {
    try {
      const res = await fetch(src, { method: 'HEAD', cache: 'no-store' });
      setState(res.status === 404 ? 'missing' : 'raw');
    } catch {
      setState('raw');
    }
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden bg-[linear-gradient(180deg,#102030_0%,#000000_100%)] ${className}`}
    >
      {state === 'ok' && (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          onError={onError}
          className="object-cover"
          style={{ objectPosition: position }}
        />
      )}
      {state === 'raw' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: position }}
        />
      )}
      {/* The lower half darkens early, that is where the copy usually sits. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,rgba(0,0,0,0)_22%,rgba(0,0,0,0)_46%,rgba(0,0,0,0.7)_78%,#000000_100%)]" />
    </div>
  );
}
