import 'server-only';
import { randomBytes } from 'node:crypto';
import { getServerConfig } from './config';
import { approvedSample, defaultOwners } from './content';
import { attemptLabel } from './attempts';
import { getStore } from './store';
import { log, maskEmail } from './log';
import { sendEmail } from './adapters/email';
import { intakeLink } from './adapters/intake';
import { background } from './background';

/**
 * The /sip booking service. The consultation is free: the student gives their
 * details (saved here and copied to the Google Sheet), then picks a time in
 * the Calendly calendar on the page. Calendly holds the calendar, sends the
 * confirmation and handles reschedules; this record notes that a time was booked.
 */

export const STATUSES = ['New', 'Booked', 'Attended', 'Blueprint delivered', 'In counselling', 'Enrolled', 'Closed'];

// Neutral attempt -> internal route. "Not sure" follows the default route.
const ROUTE_OF = { this: 'nov', next: 'may', unsure: 'nov' };
const NOTICE_VERSION = 'draft-v1';

const now = () => new Date().toISOString();
const store = () => getStore();

function newLeadId() {
  return `lead_${Date.now().toString(36)}${randomBytes(4).toString('hex')}`;
}

function history(lead, event, detail) {
  lead.history = [...(lead.history ?? []), { at: now(), event, ...(detail ? { detail } : {}) }].slice(-60);
}

/**
 * The lead record. The shape stays stable so a CRM adapter can replace the
 * store without touching the rest of the code.
 */
function newLead(input) {
  const at = now();
  const variant = input.variant === 'b' && !approvedSample() ? 'a' : input.variant;
  const channel = (granted) => ({ granted: Boolean(granted), at });
  return {
    id: newLeadId(),
    createdAt: at,
    updatedAt: at,
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    attempt: input.attempt,
    route: ROUTE_OF[input.attempt] ?? 'nov',
    source: {
      src: input.source?.src ?? null,
      utmSource: input.source?.utmSource ?? null,
      utmMedium: input.source?.utmMedium ?? null,
      utmCampaign: input.source?.utmCampaign ?? null,
      utmContent: input.source?.utmContent ?? null,
      referrer: input.source?.referrer ?? null,
    },
    variant,
    variantRequested: input.variant,
    consent: {
      privacyNotice: { accepted: true, at, noticeVersion: NOTICE_VERSION },
      marketing: {
        email: channel(input.marketing?.email),
        whatsapp: channel(input.marketing?.whatsapp),
        sms: channel(input.marketing?.sms),
      },
    },
    // Filled when the student books in Calendly. `slot` keeps the labels the sheet shows.
    calendly: null,
    slot: null,
    slotBooked: false,
    status: 'New',
    needsAttention: null,
    attendedAt: null,
    blueprintDeliveredAt: null,
    owner: defaultOwners.booking,
    nextAction: 'Follow up: details given, no time booked yet',
    notes: [],
    intakeLinkSentAt: null,
    history: [{ at, event: 'lead_created' }],
  };
}

/** What the browser may see about a lead. No contact details beyond a masked email. */
export function publicStatus(lead) {
  if (!lead) return null;
  return {
    leadId: lead.id,
    status: lead.status,
    attempt: attemptLabel(lead.attempt),
    email: maskEmail(lead.email),
    // Only when the time is known (needs CALENDLY_API_TOKEN).
    slot: lead.slot?.startsAt ? { dayLabel: lead.slot.dayLabel, timeLabel: lead.slot.timeLabel } : null,
    slotBooked: lead.slotBooked,
  };
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export async function createLead(input) {
  const lead = newLead(input);
  const { lead: saved, created } = await store().createLead(lead, input.clientRequestId);
  if (created) {
    log.info('lead.created', { leadId: saved.id, attempt: saved.attempt, variant: saved.variant });
    // After the response, so the student is not kept waiting.
    background(() =>
      store()
        .drainFallback()
        .then((n) => n && log.info('lead.fallback_recovered', { count: n }))
        .catch((err) => log.warn('lead.fallback_drain_failed', { error: err.message })),
    );
  }
  return { lead: saved, created };
}

/**
 * Last resort when the store fails: append the lead to the fallback file
 * (retried into the store on the next successful save), so it is not lost.
 */
export async function saveLeadFallback(input) {
  const lead = newLead(input);
  lead.history.push({ at: now(), event: 'saved_to_fallback' });
  try {
    await store().appendFallback({ lead, clientRequestId: input.clientRequestId });
    log.warn('lead.saved_to_fallback', { leadId: lead.id });
    return true;
  } catch (err) {
    log.error('lead.fallback_failed', { leadId: lead.id, error: err.message });
    return false;
  }
}

export function getLead(id) {
  return store().getLead(id);
}

/* ------------------------------------------------------------------ */
/* Calendly booking                                                    */
/* ------------------------------------------------------------------ */

const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

/** Calendly's own API addresses for the booked event and the invitee. */
export const CALENDLY_EVENT_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]{6,64}$/;
export const CALENDLY_INVITEE_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]{6,64}\/invitees\/[A-Za-z0-9-]{6,64}$/;

/**
 * Looks up the booked time with Calendly's API. Only when CALENDLY_API_TOKEN
 * is set (a personal access token works on the free plan); otherwise the
 * booking is recorded without its time, which Calendly still has.
 */
async function calendlyDetails(eventUri) {
  const token = getServerConfig().calendlyApiToken;
  if (!token) return null;
  try {
    const res = await fetch(eventUri, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { resource } = await res.json();
    return { startTime: resource?.start_time ?? null, endTime: resource?.end_time ?? null, eventName: resource?.name ?? null };
  } catch (err) {
    log.warn('calendly.lookup_failed', { error: err.message });
    return null;
  }
}

/**
 * Records that the student booked a time in Calendly. The page sends Calendly's
 * event and invitee addresses after Calendly reports the booking. The same
 * booking arriving twice changes nothing; a new booking (rescheduled) replaces it.
 */
export async function markScheduled(leadId, { eventUri, inviteeUri }) {
  const existing = await store().getLead(leadId);
  if (!existing) return { error: 'lead_unknown' };
  if (existing.calendly?.eventUri === eventUri) return { status: publicStatus(existing) };

  const details = await calendlyDetails(eventUri);
  const start = details?.startTime ? new Date(details.startTime) : null;

  const { lead, result } = await store().updateLead(leadId, (l) => {
    if (l.calendly?.eventUri === eventUri) return 'already';
    l.calendly = { eventUri, inviteeUri, bookedAt: now(), ...(details ?? {}) };
    l.slot =
      start && !Number.isNaN(start.getTime())
        ? { startsAt: start.toISOString(), dayLabel: dayFmt.format(start), timeLabel: `${timeFmt.format(start).toUpperCase()} IST` }
        : { startsAt: null, dayLabel: 'Booked on Calendly', timeLabel: '(time in Calendly)' };
    l.slotBooked = true;
    // Staff may already have moved the lead further on; never move it back.
    if (l.status === 'New') l.status = 'Booked';
    l.nextAction = 'Send private intake link; prepare consultation';
    history(l, 'booked_on_calendly', eventUri);
    if (l.intakeLinkSentAt) return 'booked';
    l.intakeLinkSentAt = now();
    return 'send';
  });
  if (!lead) return { error: 'lead_unknown' };
  log.info('lead.booked_on_calendly', { leadId, timeKnown: Boolean(start), result });
  if (result === 'send') background(() => sendIntakeEmail(lead));
  return { status: publicStatus(lead) };
}

/** Private intake link, sent once. Calendly sends the booking confirmation itself. */
async function sendIntakeEmail(lead) {
  await sendEmail({
    to: lead.email,
    subject: 'Your private link for marksheets and mock papers',
    template: 'private-intake-link',
    data: { link: intakeLink(lead.id) },
  });
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

const ADMIN_STAMPS = {
  Attended: 'attendedAt',
  'Blueprint delivered': 'blueprintDeliveredAt',
  'In counselling': 'counsellingAt',
  Enrolled: 'enrolledAt',
  Closed: 'closedAt',
};

export async function adminUpdate(leadId, { status, owner, nextAction, note, needsAttention }) {
  const { lead } = await store().updateLead(leadId, (l) => {
    if (status) {
      l.status = status;
      if (ADMIN_STAMPS[status]) l[ADMIN_STAMPS[status]] = now();
      history(l, 'status_changed', status);
    }
    if (owner !== undefined) l.owner = owner;
    if (nextAction !== undefined) l.nextAction = nextAction;
    if (needsAttention !== undefined) l.needsAttention = needsAttention;
    if (note) l.notes = [...l.notes, { at: now(), text: note }];
  });
  return lead;
}

export function listLeads() {
  return store().listLeads();
}
