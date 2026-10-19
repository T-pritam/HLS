'use client';

import { useEffect, useRef, useState } from 'react';
import { Inr, telHref, whatsappHref } from './format';

// Quick checks at first (the payment usually lands within seconds), then slower.
const POLL_FAST_MS = 1000;
const POLL_MS = 2500;
const PATIENCE_MS = 90000;
// Stop checking after this; the student can check again with a button.
const GIVE_UP_MS = 180000;

function SupportLine({ contact }) {
  const items = [
    contact.phone && (
      <li key="p">
        Phone: <a href={telHref(contact.phone)}>{contact.phone}</a>
      </li>
    ),
    contact.whatsapp && (
      <li key="w">
        WhatsApp: <a href={whatsappHref(contact.whatsapp)}>{contact.whatsapp}</a>
      </li>
    ),
    contact.email && (
      <li key="e">
        Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </li>
    ),
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="mt-8">
      <h2 className="label text-hls-muted">Support</h2>
      <ul className="mt-2 space-y-1">{items}</ul>
    </div>
  );
}

function Receipt({ s }) {
  const rows = [
    ['Status', s.paymentStatus === 'refunded' ? 'Refunded' : s.status],
    s.slot && s.slotBooked && ['Consultation', `${s.slot.dayLabel}, ${s.slot.timeLabel}`],
    s.paymentStatus !== 'not_required' && ['Amount paid', <Inr key="amt" amount={s.amountInr} />],
    s.paymentId && ['Payment reference', s.paymentId],
    s.orderId && ['Order reference', s.orderId],
    ['Booking reference', s.leadId],
    s.email && ['Your email', s.email],
  ].filter(Boolean);
  return (
    <dl className="mt-8 divide-y divide-hls-line rounded-md border border-hls-line bg-white px-5">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-hls-muted">{k}</dt>
          <dd className="break-all font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Shows the booking exactly as the server records it. Paid state comes from
 * Razorpay's webhook, so after checkout this page waits for it.
 */
export default function Confirmation({ leadId, token, durationMin, contact }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState(!leadId || !token);
  const [waitedLong, setWaitedLong] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [round, setRound] = useState(0);
  const started = useRef(0);

  useEffect(() => {
    if (!leadId || !token) return;
    started.current = Date.now();
    setStopped(false);
    let timer;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/book/status?leadId=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`,
          { cache: 'no-store' },
        );
        if (res.status === 404) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (stop) return;
        setS(data.status);
        const settled =
          ['captured', 'not_required', 'refunded', 'refund_pending', 'failed'].includes(data.status?.paymentStatus) ||
          data.status?.status !== 'New';
        if (settled) {
          try {
            sessionStorage.removeItem('hls-book-lead');
          } catch {}
          return;
        }
      } catch {
        // Network blip: keep polling.
      }
      const waited = Date.now() - started.current;
      if (waited > PATIENCE_MS) setWaitedLong(true);
      if (waited > GIVE_UP_MS) {
        setStopped(true);
        return;
      }
      timer = setTimeout(poll, waited < 15000 ? POLL_FAST_MS : POLL_MS);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [leadId, token, round]);

  if (error) {
    return (
      <div>
        <h1 className="text-[36px] leading-tight">We couldn&rsquo;t find this booking</h1>
        <p className="mt-4 text-hls-muted">Please use the link from your booking, or contact support.</p>
        <SupportLine contact={contact} />
      </div>
    );
  }

  const paid = s && (s.paymentStatus === 'captured' || s.paymentStatus === 'not_required');
  const booked = paid && s.slotBooked;
  const paidNoSlot = paid && !s.slotBooked && s.needsAttention === 'slot_unavailable';
  const refunded = s && (['refunded', 'refund_pending'].includes(s.paymentStatus) || s.status === 'Refunded');
  const failed = s && s.paymentStatus === 'failed' && !paid;

  return (
    <div aria-live="polite">
      {!s && <h1 className="text-[36px] leading-tight">Checking your booking…</h1>}

      {s && !paid && !failed && !refunded && (
        <>
          <h1 className="text-[36px] leading-tight">Confirming your payment…</h1>
          <p className="mt-4 text-hls-muted">
            We are waiting for the payment provider to confirm. This usually takes a few seconds. You can keep this
            page open.
          </p>
          {waitedLong && (
            <p className="mt-4">
              This is taking longer than usual. If you were charged, your booking is confirmed automatically as
              soon as the confirmation arrives, even if you close this page. Your booking reference is{' '}
              <strong>{s.leadId}</strong>.
            </p>
          )}
          {stopped && (
            <button type="button" className="btn-secondary mt-6" onClick={() => setRound((r) => r + 1)}>
              Check again
            </button>
          )}
          <SupportLine contact={contact} />
        </>
      )}

      {failed && (
        <>
          <h1 className="text-[36px] leading-tight">The payment did not go through</h1>
          <p className="mt-4 text-hls-muted">Nothing has been booked, and the time you chose has been released.</p>
          <a href="/book#book" className="btn-primary mt-6">
            Try again
          </a>
          <SupportLine contact={contact} />
        </>
      )}

      {booked && !refunded && (
        <>
          <p className="label text-hls-signal-dark">Booked</p>
          <h1 className="mt-3 text-[36px] leading-tight md:text-[44px]">Your blueprint consultation is booked.</h1>
          <Receipt s={s} />
          <h2 className="mt-10 text-[26px]">What to prepare</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Your previous marksheets</li>
            <li>Your current or intended attempt</li>
            <li>Recent mock papers</li>
          </ul>
          <p className="mt-4 text-hls-muted">
            You will receive a private link by email to share your marksheets and mock papers. Please don&rsquo;t
            send them any other way.
            {durationMin ? ` The consultation takes about ${durationMin} minutes.` : ''}
          </p>
          <SupportLine contact={contact} />
        </>
      )}

      {paidNoSlot && !refunded && (
        <>
          <p className="label text-hls-signal-dark">Payment received</p>
          <h1 className="mt-3 text-[36px] leading-tight">We have your payment. Your time was taken just before.</h1>
          <p className="mt-4">
            Your payment and details are safe with us. Our team will contact you to arrange a new time or a refund,
            whichever you prefer.
          </p>
          <Receipt s={s} />
          <SupportLine contact={contact} />
        </>
      )}

      {refunded && (
        <>
          <h1 className="text-[36px] leading-tight">
            {s.paymentStatus === 'refund_pending' ? 'Your refund is being processed' : 'This booking was refunded'}
          </h1>
          <Receipt s={s} />
          <SupportLine contact={contact} />
        </>
      )}
    </div>
  );
}
