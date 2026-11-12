'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ATTEMPTS } from '@/lib/book/attempts';
import { telHref, whatsappHref } from './format';

/**
 * Booking flow: eligibility -> details (lead saved) -> a time in the Calendly
 * calendar on the page. The consultation is free. When Calendly reports the
 * booking, the lead is marked booked; Calendly sends the confirmation email.
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

let calendlyScript = null;

/** Loads Calendly's embed script once. Started on the details step so the calendar opens at once. */
function loadCalendly() {
  if (window.Calendly) return Promise.resolve(true);
  if (calendlyScript) return calendlyScript;
  calendlyScript = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      calendlyScript = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return calendlyScript;
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
    <h3 ref={titleRef} tabIndex={-1} className="text-[clamp(26px,calc(22.183px+1.018vw),30px)] leading-tight outline-none">
      {n && <span className="label mb-2 block text-hls-signal-dark">Step {n} of 3</span>}
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */

export default function Booking({ variant, calendlyUrl, contact }) {
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
  // null while loading, true once Calendly's calendar is up, false if it could not load.
  const [calendarReady, setCalendarReady] = useState(null);
  const requestId = useRef(null);
  const source = useRef({});
  const fault = useRef(null);
  const titleRef = useRef(null);
  const calendarRef = useRef(null);
  // Name and email for Calendly's form, also after a refresh.
  const prefill = useRef({ name: '', email: '' });

  const go = useCallback((next) => {
    setStep(next);
    requestAnimationFrame(() => titleRef.current?.focus());
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
      prefill.current = { name: saved.name ?? '', email: saved.email ?? '' };
      setLead(saved);
      setStatus(res.data.status);
      setStep(res.data.status?.slotBooked ? 'booked' : 'calendar');
    })();
  }, []);

  // Variant C's attempt question pre-selects the attempt.
  useEffect(() => {
    const onAttempt = (e) => setForm((f) => ({ ...f, attempt: e.detail }));
    window.addEventListener('hls:attempt', onAttempt);
    return () => window.removeEventListener('hls:attempt', onAttempt);
  }, []);

  // Fetch Calendly's script while the student fills in their details.
  useEffect(() => {
    if (calendlyUrl && (step === 'details' || step === 'calendar')) loadCalendly();
  }, [step, calendlyUrl]);

  // Show the calendar, with the name and email already filled in.
  useEffect(() => {
    if (step !== 'calendar' || !calendlyUrl || !lead) return;
    let cancelled = false;
    setCalendarReady(null);
    loadCalendly().then((ok) => {
      const el = calendarRef.current;
      if (cancelled || !el) return;
      if (!ok || !window.Calendly) {
        setCalendarReady(false);
        return;
      }
      el.innerHTML = '';
      const s = source.current;
      // Only the campaign values that are set; Calendly would send the rest as "undefined".
      const utm = Object.fromEntries(
        ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent'].filter((k) => s[k]).map((k) => [k, s[k]]),
      );
      // Calendly sends the prefill to its frame by message, not in the address.
      const url = new URL(calendlyUrl);
      url.searchParams.set('hide_gdpr_banner', '1'); // its cookie banner covers half the calendar on a phone
      window.Calendly.initInlineWidget({ url: url.toString(), parentElement: el, prefill: prefill.current, utm });
      setCalendarReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [step, calendlyUrl, lead]);

  // Calendly tells the page when a time is booked; the server then marks the lead booked.
  useEffect(() => {
    if (step !== 'calendar' || !lead) return;
    async function onMessage(e) {
      if (!/^https:\/\/([a-z0-9-]+\.)*calendly\.com$/.test(e.origin)) return;
      if (e.data?.event !== 'calendly.event_scheduled') return;
      const eventUri = e.data.payload?.event?.uri;
      const inviteeUri = e.data.payload?.invitee?.uri;
      const res = await api('/api/book/scheduled', { body: { ...lead, eventUri, inviteeUri } }).catch(() => null);
      if (res?.ok) setStatus(res.data.status);
      writeSession({ ...lead, ...prefill.current, booked: true });
      go('booked');
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [step, lead, go]);

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
      prefill.current = { name: form.name.trim(), email: form.email.trim() };
      setLead(l);
      setStatus(res.data.status);
      writeSession({ ...l, ...prefill.current });
      go('calendar');
    } catch {
      setNotice({ kind: 'error', text: 'We could not reach the server. Your details are still here.', fallback: true });
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="card p-5 sm:p-8">
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
          <p className="mt-3 text-hls-muted">We save these first, so we can help if anything goes wrong with the booking.</p>

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
                  <a href="/sip/privacy" target="_blank" rel="noopener">
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

      {step === 'calendar' && (
        <div className="mt-2">
          <StepTitle n={3} titleRef={titleRef}>
            Choose a time
          </StepTitle>
          {calendlyUrl ? (
            <>
              <p className="mt-3 text-hls-muted">
                Pick a time that suits you. Your name and email are already filled in. You get a confirmation email
                from Calendly with a link to reschedule or cancel.
              </p>
              {calendarReady === false ? (
                <Notice
                  notice={{ kind: 'error', text: 'The booking calendar could not load.', fallback: true }}
                  contact={contact}
                />
              ) : (
                <>
                  {calendarReady === null && <p className="mt-6">Loading the calendar…</p>}
                  <div ref={calendarRef} className="mt-6 -mx-2 h-[700px] min-w-[280px] overflow-hidden sm:mx-0" />
                </>
              )}
            </>
          ) : (
            <div className="mt-3">
              <p className="text-hls-muted">
                Online booking opens soon. We have your details and will contact you to fix a time for your
                consultation.
              </p>
              <FallbackContact contact={contact} />
            </div>
          )}
        </div>
      )}

      {step === 'booked' && (
        <div className="mt-2" role="status">
          <StepTitle titleRef={titleRef}>You&rsquo;re booked</StepTitle>
          {status?.slot && (
            <p className="mt-4 font-medium">
              {status.slot.dayLabel}, {status.slot.timeLabel}
            </p>
          )}
          <p className="mt-3 text-hls-muted">
            Calendly has emailed your confirmation{status?.email ? ` to ${status.email}` : ''}, with a link to
            reschedule or cancel. Before your consultation, we will send a private link for your marksheets and mock
            papers.
          </p>
        </div>
      )}
    </div>
  );
}
