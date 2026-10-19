'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ATTEMPTS } from '@/lib/book/attempts';
import { Inr, telHref, whatsappHref } from './format';

/**
 * Booking flow: eligibility -> details (lead saved) -> slot (held) -> payment.
 * The browser never decides that a payment succeeded: after checkout it goes
 * to the confirmation page, which waits for the server's record.
 */

const SESSION_KEY = 'hls-book-lead';
const FIELDS = ['name', 'mobile', 'email', 'attempt', 'privacyAccepted'];

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeSession(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode: the flow still works, it just won't survive a refresh.
  }
}

function captureSource() {
  const p = new URLSearchParams(window.location.search);
  const get = (k) => p.get(k) || undefined;
  return {
    src: get('src'),
    utmSource: get('utm_source'),
    utmMedium: get('utm_medium'),
    utmCampaign: get('utm_campaign'),
    utmContent: get('utm_content'),
    referrer: document.referrer || undefined,
  };
}

async function api(path, { method = 'POST', body, fault } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (fault) headers['x-book-fault'] = fault;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON error page.
  }
  return { ok: res.ok, status: res.status, data };
}

const timeFmt = (iso) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .toUpperCase();

let razorpayScript = null;

/** Loads Razorpay Checkout once. Called early (on the time step) so Pay opens at once. */
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScript) return razorpayScript;
  razorpayScript = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      razorpayScript = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return razorpayScript;
}

/* ------------------------------------------------------------------ */

function FallbackContact({ contact }) {
  const has = contact.phone || contact.whatsapp || contact.email;
  if (!has) return <p className="mt-2">Please try again in a few minutes.</p>;
  return (
    <div className="mt-2">
      <p>You can also reach us directly and we will help you book:</p>
      <ul className="mt-2 space-y-1">
        {contact.phone && (
          <li>
            Phone: <a href={telHref(contact.phone)}>{contact.phone}</a>
          </li>
        )}
        {contact.whatsapp && (
          <li>
            WhatsApp: <a href={whatsappHref(contact.whatsapp)}>{contact.whatsapp}</a>
          </li>
        )}
        {contact.email && (
          <li>
            Email: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </li>
        )}
      </ul>
    </div>
  );
}

function Notice({ notice, contact }) {
  if (!notice) return null;
  const tone =
    notice.kind === 'error'
      ? 'border-hls-error bg-[#fef3f2] text-[#7a271a]'
      : 'border-hls-signal bg-[#eef5fb] text-hls-navy';
  return (
    <div className={`mt-6 rounded-md border-l-4 p-4 text-[16px] ${tone}`}>
      <p className="font-medium">{notice.text}</p>
      {notice.fallback && <FallbackContact contact={contact} />}
    </div>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[15px] text-hls-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function StepTitle({ n, children, titleRef }) {
  return (
    <h3 ref={titleRef} tabIndex={-1} className="text-[26px] leading-tight outline-none md:text-[30px]">
      {n && <span className="label mb-2 block text-hls-signal-dark">Step {n} of 3</span>}
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */

export default function Booking({ variant, priceInr, taxLabel, paymentMode, slotsSynthetic, holdMinutes, contact }) {
  const [step, setStep] = useState('eligibility');
  const [lead, setLead] = useState(null); // { leadId, token }
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    attempt: '',
    privacyAccepted: false,
    marketing: { email: false, whatsapp: false, sms: false },
    website: '',
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState(null);
  const [mockOpen, setMockOpen] = useState(false);
  // 'open' while Razorpay's window is up, 'received' once it reports success.
  const [checkout, setCheckout] = useState(null);
  const requestId = useRef(null);
  const source = useRef({});
  const fault = useRef(null);
  const titleRef = useRef(null);
  const payLock = useRef(false);
  // The order is created in the background as soon as a time is held.
  const prefetched = useRef(null);
  const mockDialog = useRef(null);

  const go = useCallback((next) => {
    setStep(next);
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  const confirmationUrl = useCallback(
    (l) => `/book/confirmation?lead=${encodeURIComponent(l.leadId)}&t=${encodeURIComponent(l.token)}`,
    [],
  );

  const loadSlots = useCallback(async (l) => {
    setSlots(null);
    const q = l ? `?leadId=${encodeURIComponent(l.leadId)}&token=${encodeURIComponent(l.token)}` : '';
    const res = await fetch(`/api/book/slots${q}`).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    setSlots(data?.slots ?? []);
    if (!data) setNotice({ kind: 'error', text: 'We could not load the available times.', fallback: true });
  }, []);

  // Restore an in-progress booking after a refresh; capture UTMs once.
  useEffect(() => {
    source.current = captureSource();
    requestId.current = uuid();
    fault.current = new URLSearchParams(window.location.search).get('book_fault');
    const saved = readSession();
    if (!saved?.leadId) return;
    (async () => {
      const res = await api(
        `/api/book/status?leadId=${encodeURIComponent(saved.leadId)}&token=${encodeURIComponent(saved.token)}`,
        { method: 'GET' },
      );
      if (!res.ok) return writeSession(null);
      const s = res.data.status;
      setLead(saved);
      setStatus(s);
      if (s.status !== 'New' || s.paymentStatus === 'captured') {
        window.location.assign(confirmationUrl(saved));
        return;
      }
      setStep('slot');
      loadSlots(saved);
    })();
  }, [confirmationUrl, loadSlots]);

  // Variant C's attempt question pre-selects the attempt.
  useEffect(() => {
    const onAttempt = (e) => setForm((f) => ({ ...f, attempt: e.detail }));
    window.addEventListener('hls:attempt', onAttempt);
    return () => window.removeEventListener('hls:attempt', onAttempt);
  }, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const setMarketing = (channel) => (e) =>
    setForm((f) => ({ ...f, marketing: { ...f.marketing, [channel]: e.target.checked } }));

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your name.';
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(form.mobile.replace(/[\s()-]/g, '')))
      e.mobile = 'Please enter a 10-digit Indian mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (!form.attempt) e.attempt = 'Please choose which attempt you are preparing for.';
    if (!form.privacyAccepted) e.privacyAccepted = 'Please confirm you have read the privacy notice.';
    return e;
  }

  async function submitDetails(ev) {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setNotice({ kind: 'error', text: 'Please check the highlighted fields.' });
      const first = FIELDS.find((f) => e[f]);
      document.getElementById(`bk-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await api('/api/book/lead', {
        fault: fault.current,
        body: {
          clientRequestId: requestId.current,
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          attempt: form.attempt,
          eligible: true,
          privacyAccepted: form.privacyAccepted,
          marketing: form.marketing,
          variant,
          source: source.current,
          website: form.website,
        },
      });
      if (res.status === 422) {
        setErrors(res.data.fields ?? {});
        setNotice({ kind: 'error', text: res.data.error ?? 'Please check the highlighted fields.' });
        return;
      }
      if (!res.ok) {
        setNotice({
          kind: 'error',
          text: res.data.error ?? 'We could not save your details just now.',
          fallback: true,
        });
        return;
      }
      const l = { leadId: res.data.leadId, token: res.data.token };
      setLead(l);
      setStatus(res.data.status);
      writeSession(l);
      go('slot');
      loadSlots(l);
    } catch {
      setNotice({ kind: 'error', text: 'We could not reach the server. Your details are still here.', fallback: true });
    } finally {
      setBusy(false);
    }
  }

  async function chooseSlot(slotId) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await api('/api/book/hold', { body: { ...lead, slotId } });
      if (!res.ok) {
        setNotice({ kind: 'error', text: res.data.error ?? 'That slot is not available. Please choose another.' });
        loadSlots(lead);
        return;
      }
      setStatus(res.data.status);
      if (res.data.status?.paymentRequired !== false) {
        prefetched.current = api('/api/book/order', { body: lead, fault: fault.current }).catch(() => null);
      }
    } finally {
      setBusy(false);
    }
  }

  // Fetch Razorpay's script while the student picks a time.
  useEffect(() => {
    if (step === 'slot' && paymentMode !== 'mock') loadRazorpay();
  }, [step, paymentMode]);

  const held = status?.hold && Date.parse(status.hold.expiresAt) > Date.now() ? status.hold : null;

  async function cancelled(reason, text) {
    prefetched.current = null;
    const res = await api('/api/book/hold', { method: 'DELETE', body: { ...lead, reason } });
    if (res.ok) setStatus(res.data.status);
    setNotice({ kind: 'info', text });
    loadSlots(lead);
  }

  function paid(resp) {
    // Show it at once, send the signature for the server to check (keepalive
    // lets it finish while the page changes), and move on. The confirmation
    // page shows the booking as soon as the server has Razorpay's word for it.
    setCheckout('received');
    fetch('/api/book/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, ...resp }),
      keepalive: true,
    }).catch(() => null);
    window.location.assign(confirmationUrl(lead));
  }

  async function pay() {
    if (payLock.current) return; // double click
    payLock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      // Use the order made in the background when the time was held, if the
      // hold still has a minute left; otherwise ask for it now.
      const pending = prefetched.current;
      prefetched.current = null;
      const fresh = held && Date.parse(held.expiresAt) - Date.now() > 60000;
      let res = pending && fresh ? await pending : null;
      if (!res?.ok || !res.data?.order) res = await api('/api/book/order', { body: lead, fault: fault.current });
      if (res.data.alreadyBooked || res.data.noPayment) {
        window.location.assign(confirmationUrl(lead));
        return;
      }
      if (!res.ok) {
        setNotice({ kind: 'error', text: res.data.error ?? 'We could not start the payment.', fallback: res.data.fallback });
        if (res.data.code === 'hold_expired' || res.data.code === 'slot_taken') loadSlots(lead);
        return;
      }
      setStatus(res.data.status);
      const order = res.data.order;

      if (order.mode === 'mock') {
        setMockOpen(true);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setNotice({ kind: 'error', text: 'The payment window could not load.', fallback: true });
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.id,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'HIM LIFE SCHOOL',
        description: 'Blueprint Consultation',
        prefill: order.prefill,
        notes: { leadId: lead.leadId },
        theme: { color: '#1273c2' },
        handler: paid,
        modal: {
          ondismiss: () => {
            setCheckout(null);
            cancelled('cancelled', 'Payment cancelled. Your slot has been released. Choose a time to try again.');
          },
          confirm_close: true,
        },
      });
      rzp.on('payment.failed', (r) => {
        setNotice({
          kind: 'error',
          text: `The payment did not go through${r?.error?.description ? `: ${r.error.description.replace(/[.\s]+$/, '')}` : ''}. You can try again in the payment window.`,
        });
      });
      setCheckout('open');
      rzp.open();
    } catch {
      setNotice({ kind: 'error', text: 'We could not start the payment.', fallback: true });
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  }

  // Mock checkout dialog (RAZORPAY_MODE=mock only).
  useEffect(() => {
    const d = mockDialog.current;
    if (!d) return;
    if (mockOpen && !d.open) d.showModal();
    if (!mockOpen && d.open) d.close();
  }, [mockOpen]);

  async function mock(outcome) {
    if (outcome === 'cancel') {
      setMockOpen(false);
      cancelled('cancelled', 'Payment cancelled. Your slot has been released. Choose a time to try again.');
      return;
    }
    setBusy(true);
    const res = await api('/api/book/mock-checkout', { body: { ...lead, outcome } });
    setBusy(false);
    if (outcome === 'fail') {
      setMockOpen(false);
      setNotice({ kind: 'error', text: 'The payment did not go through (simulated). Your slot has been released.' });
      loadSlots(lead);
      setStatus((s) => (s ? { ...s, hold: null } : s));
      return;
    }
    if (res.ok) paid(res.data);
  }

  /* ---------------------------------------------------------------- */

  const days = [];
  for (const s of slots ?? []) {
    const day = days.find((d) => d.day === s.day);
    if (day) day.slots.push(s);
    else days.push({ day: s.day, label: s.dayLabel, slots: [s] });
  }

  return (
    <div className="rounded-md border border-hls-line bg-white p-5 sm:p-8">
      <div aria-live="polite" aria-atomic="true">
        <Notice notice={notice} contact={contact} />
      </div>

      {step === 'eligibility' && (
        <div className="mt-2">
          <StepTitle n={1} titleRef={titleRef}>
            Are you a CA Final Group 1 repeater?
          </StepTitle>
          <p className="mt-3 text-hls-muted">
            That means you have attempted CA Final Group 1 before and are preparing to attempt it again.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => go('details')}>
              Yes, I am
            </button>
            <button type="button" className="btn-secondary" onClick={() => go('ineligible')}>
              No
            </button>
          </div>
        </div>
      )}

      {step === 'ineligible' && (
        <div className="mt-2">
          <StepTitle titleRef={titleRef}>This consultation is not the right fit</StepTitle>
          <p className="mt-3 text-hls-muted">
            The Blueprint Consultation is only for CA Final Group 1 repeaters, so we can&rsquo;t book it for you.
            Thank you for considering HIM LIFE SCHOOL.
          </p>
          <button type="button" className="btn-secondary mt-6" onClick={() => go('eligibility')}>
            I answered by mistake
          </button>
        </div>
      )}

      {step === 'details' && (
        <form noValidate onSubmit={submitDetails} className="mt-2">
          <StepTitle n={2} titleRef={titleRef}>
            Your details
          </StepTitle>
          <p className="mt-3 text-hls-muted">We save these before payment so we can help if anything goes wrong.</p>

          <div className="mt-6 grid gap-5">
            <Field id="bk-name" label="Full name" error={errors.name}>
              <input
                id="bk-name"
                className="field"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'bk-name-error' : undefined}
              />
            </Field>
            <Field id="bk-mobile" label="Mobile (WhatsApp)" hint="10-digit Indian number" error={errors.mobile}>
              <input
                id="bk-mobile"
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.mobile}
                onChange={set('mobile')}
                aria-invalid={Boolean(errors.mobile)}
                aria-describedby={`bk-mobile-hint${errors.mobile ? ' bk-mobile-error' : ''}`}
              />
            </Field>
            <Field id="bk-email" label="Email" error={errors.email}>
              <input
                id="bk-email"
                className="field"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'bk-email-error' : undefined}
              />
            </Field>

            <fieldset aria-describedby={errors.attempt ? 'bk-attempt-error' : undefined}>
              <legend className="font-medium">Which attempt are you preparing for?</legend>
              <div className="mt-1 grid gap-0 sm:grid-cols-3 sm:gap-3">
                {ATTEMPTS.map((a, i) => (
                  <label key={a.value} className="choice">
                    <input
                      type="radio"
                      name="attempt"
                      id={i === 0 ? 'bk-attempt' : undefined}
                      value={a.value}
                      checked={form.attempt === a.value}
                      onChange={set('attempt')}
                    />
                    <span>{a.label}</span>
                  </label>
                ))}
              </div>
              {errors.attempt && (
                <p id="bk-attempt-error" className="field-error">
                  {errors.attempt}
                </p>
              )}
            </fieldset>

            {/* Honeypot: hidden from people and assistive tech. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="bk-website">Website</label>
              <input id="bk-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>

            <div className="rounded-md bg-hls-wash p-4 text-[15px]">
              <p className="font-medium text-hls-navy">How we use your details</p>
              <p className="mt-1 text-hls-muted">
                We use your name, mobile and email to book and run your consultation and to contact you about it.
                Your booking record is seen only by the HLS team handling it. Marksheets and mock papers are never
                collected on this page.
              </p>
            </div>

            <div>
              <label className="choice">
                <input
                  id="bk-privacyAccepted"
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={set('privacyAccepted')}
                  aria-invalid={Boolean(errors.privacyAccepted)}
                  aria-describedby={errors.privacyAccepted ? 'bk-privacyAccepted-error' : undefined}
                />
                <span>
                  I have read the{' '}
                  <a href="/book/privacy" target="_blank" rel="noopener">
                    privacy notice
                  </a>{' '}
                  and agree to my details being used to book and run this consultation. (Required)
                </span>
              </label>
              {errors.privacyAccepted && (
                <p id="bk-privacyAccepted-error" className="field-error">
                  {errors.privacyAccepted}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="font-medium">Updates from HIM LIFE SCHOOL (optional)</legend>
              <p className="mt-1 text-[15px] text-hls-muted">
                Separately, you may hear from us about HLS programmes. Tick only the channels you want. You can
                withdraw this at any time.
              </p>
              <div className="mt-1 flex flex-col sm:flex-row sm:gap-6">
                {[
                  ['email', 'Email'],
                  ['whatsapp', 'WhatsApp'],
                  ['sms', 'SMS'],
                ].map(([k, l]) => (
                  <label key={k} className="choice">
                    <input type="checkbox" checked={form.marketing[k]} onChange={setMarketing(k)} />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <button type="button" className="btn-secondary" onClick={() => go('eligibility')}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Continue to choose a time'}
            </button>
          </div>
        </form>
      )}

      {step === 'slot' && (
        <div className="mt-2">
          <StepTitle n={3} titleRef={titleRef}>
            Choose a time and pay
          </StepTitle>
          {slotsSynthetic && (
            <p className="mt-3 inline-block rounded bg-[#fff7ed] px-2 py-1 font-mono text-[13px] text-[#92400e]">
              Sample times for testing. Not real availability.
            </p>
          )}
          <p className="mt-3 text-hls-muted">
            All times are India Standard Time. We hold your chosen time for {holdMinutes} minutes while you pay.
          </p>

          {slots === null && <p className="mt-6">Loading available times…</p>}
          {slots && slots.length === 0 && (
            <p className="mt-6">There are no open times right now. Please check back soon.</p>
          )}

          <div className="mt-6 space-y-6">
            {days.map((d) => (
              <fieldset key={d.day}>
                <legend className="label text-hls-muted">{d.label}</legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {d.slots.map((s) => {
                    const selected = held?.slotId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={busy && !selected}
                        onClick={() => chooseSlot(s.id)}
                        className={`min-h-[48px] rounded border px-3 py-2 text-[16px] ${
                          selected
                            ? 'border-hls-signal bg-hls-signal font-semibold text-white'
                            : 'border-hls-line bg-white hover:border-hls-steel'
                        }`}
                      >
                        {s.timeLabel.replace(' IST', '')}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {held && status?.slot && (
            <div className="mt-8 rounded-md bg-hls-wash p-4" aria-live="polite">
              <p className="font-medium">
                {status.slot.dayLabel}, {status.slot.timeLabel}
              </p>
              <p className="text-[15px] text-hls-muted">Held for you until {timeFmt(held.expiresAt)} IST.</p>
            </div>
          )}

          <div className="mt-8">
            {checkout ? (
              <div className="rounded-md border-l-4 border-hls-signal bg-[#eef5fb] p-4" role="status" aria-live="polite">
                <p className="font-medium text-hls-navy">
                  {checkout === 'received'
                    ? 'Payment received. Confirming your booking…'
                    : 'Finish paying in the Razorpay window.'}
                </p>
                <p className="mt-1 text-[15px] text-hls-muted">
                  {checkout === 'received'
                    ? 'This takes a moment. Please keep this page open.'
                    : 'This page updates by itself when the payment is done. Please don’t pay twice.'}
                </p>
              </div>
            ) : status?.paymentRequired === false ? (
              <button type="button" className="btn-primary w-full sm:w-auto" disabled={!held || busy} onClick={pay}>
                Confirm booking
              </button>
            ) : (
              <button type="button" className="btn-primary w-full sm:w-auto" disabled={!held || busy} onClick={pay}>
                {busy ? 'Please wait…' : (
                  <>
                    Pay <Inr amount={priceInr} />
                  </>
                )}
              </button>
            )}
            <p className="mt-3 text-[15px] text-hls-muted">
              <Inr amount={priceInr} />, {taxLabel}. Paid securely through Razorpay.
              {paymentMode === 'mock' && ' (Test mode: simulated checkout, no real payment.)'}
            </p>
          </div>
        </div>
      )}

      {(paymentMode === 'mock' || mockOpen) && (
        <dialog
          ref={mockDialog}
          onCancel={(e) => {
            e.preventDefault();
            mock('cancel');
          }}
          aria-labelledby="mock-title"
          className="m-auto w-[min(92vw,420px)] rounded-md border border-hls-line p-6 backdrop:bg-black/40"
        >
          <p className="label text-[#92400e]">Test checkout · no real payment</p>
          <h4 id="mock-title" className="mt-3 font-display text-[24px]">
            Simulated Razorpay checkout
          </h4>
          <p className="mt-2 text-[15px] text-hls-muted">
            <Inr amount={priceInr} /> for the Blueprint Consultation. RAZORPAY_MODE=mock: nothing is charged.
          </p>
          <div className="mt-6 grid gap-3">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => mock('success')}>
              Simulate successful payment
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => mock('fail')}>
              Simulate failed payment
            </button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => mock('cancel')}>
              Close checkout (cancel)
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
