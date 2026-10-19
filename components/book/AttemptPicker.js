'use client';

import { useState } from 'react';
import { ATTEMPTS } from '@/lib/book/attempts';

// Neutral copy per attempt. No exam dates, no timing promises.
const COPY = {
  this: 'Preparing for this attempt: the consultation looks at where you stand now, and your blueprint sets out realistic priorities for the time you have.',
  next: 'Preparing for the next attempt: the consultation looks at where the marks went last time, and your blueprint sets out what to change before you start again.',
  unsure: 'Not sure yet: the consultation looks at where you stand, and your blueprint sets out a realistic plan whichever attempt you choose.',
};

/** Variant C's question. Choosing an option also pre-selects it in the booking form. */
export default function AttemptPicker({ priceLine }) {
  const [choice, setChoice] = useState(null);

  function pick(value) {
    setChoice(value);
    window.dispatchEvent(new CustomEvent('hls:attempt', { detail: value }));
  }

  return (
    <div className="mt-8">
      <div role="group" aria-label="Which attempt are you preparing for?" className="flex flex-col gap-3 sm:flex-row">
        {ATTEMPTS.map((a) => (
          <button
            key={a.value}
            type="button"
            aria-pressed={choice === a.value}
            onClick={() => pick(a.value)}
            className={`btn-secondary sm:min-w-[10rem] ${choice === a.value ? '!border-hls-signal bg-[#eaf3fb] font-semibold' : ''}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {choice ? (
          <>
            <p className="lede mt-6">{COPY[choice]}</p>
            {priceLine}
            <a href="#book" className="btn-primary mt-6 w-full sm:w-auto">
              Book your blueprint consultation
            </a>
            <p className="mt-4 text-[15px] text-hls-muted">No obligation to join anything afterwards.</p>
          </>
        ) : (
          <p className="lede mt-6">
            The Blueprint Consultation is a one-to-one conversation about your attempt, ending in a written
            blueprint. Choose your attempt to see how it applies to you.
          </p>
        )}
      </div>
    </div>
  );
}
