import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { getPublicConfig, getServerConfig, getSlotConfig } from './config';
import { approvedSample, defaultOwners } from './content';
import { attemptLabel } from './attempts';
import { getStore } from './store';
import { availableSlots, findSlot, sameDayIds } from './slots';
import { log, maskEmail } from './log';
import * as gateway from './razorpay';
import { sendEmail } from './adapters/email';
import { intakeLink } from './adapters/intake';
import { alertOwner } from './adapters/notify';
import { background } from './background';

/**
 * The /book booking service. Paid state is only ever set from Razorpay's own
 * data: a signed webhook (the source of truth) or, as a backstop when a
 * webhook is late, a server-to-server fetch of the order. The browser's word
 * (redirect or checkout callback) never marks anything paid.
 */

export const STATUSES = [
  'New',
  'Booked',
  'Attended',
  'Blueprint delivered',
  'In counselling',
  'Enrolled',
  'Refunded',
  'Closed',
];

// Neutral attempt -> internal route. "Not sure" follows the default route.
const ROUTE_OF = { this: 'nov', next: 'may', unsure: 'nov' };
const NOTICE_VERSION = 'draft-v1';
const RECONCILE_EVERY_MS = 10000;

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
 * local store without touching the rest of the code.
 */
function newLead(input) {
  const at = now();
  const route = ROUTE_OF[input.attempt] ?? 'nov';
  const cfg = getServerConfig();
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
    route,
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
    paymentRequired: cfg.paymentRequired[route] !== false,
    paymentStatus: 'none',
    amountPaise: getServerConfig().priceInr * 100,
    currency: 'INR',
    invoiceType: cfg.invoiceType,
    orderId: null,
    paymentId: null,
    paidAt: null,
    slot: null,
    slotBooked: false,
    holdExpiresAt: null,
    status: 'New',
    needsAttention: null,
    attendedAt: null,
    blueprintDeliveredAt: null,
    owner: defaultOwners.booking,
    nextAction: 'Follow up: lead saved before payment',
    notes: [],
    confirmationSentAt: null,
    intakeLinkSentAt: null,
    history: [{ at, event: 'lead_created' }],
  };
}

/** What the browser may see about a lead. No contact details beyond a masked email. */
export function publicStatus(lead) {
  if (!lead) return null;
  const holdLive = lead.holdExpiresAt && Date.parse(lead.holdExpiresAt) > Date.now();
  return {
    leadId: lead.id,
    status: lead.status,
    paymentStatus: lead.paymentStatus,
    paymentRequired: lead.paymentRequired,
    amountInr: Math.round(lead.amountPaise / 100),
    attempt: attemptLabel(lead.attempt),
    email: maskEmail(lead.email),
    slot: lead.slot ? { id: lead.slot.id, dayLabel: lead.slot.dayLabel, timeLabel: lead.slot.timeLabel } : null,
    slotBooked: lead.slotBooked,
    hold: holdLive && !lead.slotBooked ? { slotId: lead.slot?.id, expiresAt: lead.holdExpiresAt } : null,
    orderId: lead.orderId,
    paymentId: lead.paymentId,
    paidAt: lead.paidAt,
    needsAttention: lead.needsAttention,
    lastPaymentError: lead.lastPaymentError ?? null,
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
/* Slots                                                               */
/* ------------------------------------------------------------------ */

export async function listSlots(leadId = null) {
  const taken = await store().takenSlots(Date.now(), leadId);
  return availableSlots(taken);
}

function holdUntil() {
  return new Date(Date.now() + getSlotConfig().holdMinutes * 60000).toISOString();
}

function capacityFor(slot) {
  return { sameDay: sameDayIds(slot), capacity: getSlotConfig().capacityPerDay };
}

export async function holdSlot(leadId, slotId) {
  const slot = findSlot(slotId);
  if (!slot) return { error: 'slot_unknown' };
  if (Date.parse(slot.startsAt) <= Date.now()) return { error: 'slot_taken' };
  const expiresAt = holdUntil();
  const { lead, result } = await store().updateLead(leadId, (l, ledger) => {
    if (l.status !== 'New' || l.paymentStatus === 'captured') return 'not_new';
    const r = ledger.hold(slot.id, l.id, expiresAt, capacityFor(slot));
    if (r === 'held') {
      l.slot = slot;
      l.holdExpiresAt = expiresAt;
      history(l, 'slot_held', slot.id);
    }
    return r;
  });
  if (!lead) return { error: 'lead_unknown' };
  if (result === 'not_new') return { error: 'already_booked', status: publicStatus(lead) };
  if (result !== 'held') return { error: result === 'full' ? 'day_full' : 'slot_taken' };
  log.info('slot.held', { leadId, slotId: slot.id });
  return { status: publicStatus(lead) };
}

export async function releaseHold(leadId, reason = 'released') {
  const { lead } = await store().updateLead(leadId, (l, ledger) => {
    if (l.slotBooked) return;
    ledger.release(l.id);
    l.holdExpiresAt = null;
    history(l, `slot_${reason}`);
    if (reason === 'cancelled' && l.paymentStatus !== 'captured') l.nextAction = 'Follow up: cancelled at payment';
  });
  if (lead) log.info('slot.released', { leadId, reason });
  return lead ? publicStatus(lead) : null;
}

/* ------------------------------------------------------------------ */
/* Payment                                                             */
/* ------------------------------------------------------------------ */

const leadLocks = new Map();

/** Serialises payment work per lead so a double click cannot create two orders. */
function withLeadLock(leadId, fn) {
  const prev = leadLocks.get(leadId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  leadLocks.set(leadId, tail);
  tail.then(() => leadLocks.get(leadId) === tail && leadLocks.delete(leadId));
  return run;
}

/**
 * Creates (or reuses) the Razorpay order for a lead. The amount always comes
 * from server config; the browser never sends one. One order per lead: retries,
 * refreshes and double clicks get the same order back.
 */
export function startPayment(leadId) {
  return withLeadLock(leadId, async () => {
    const lead = await store().getLead(leadId);
    if (!lead) return { error: 'lead_unknown' };
    if (lead.status !== 'New' || lead.paymentStatus === 'captured') {
      return { alreadyBooked: true, status: publicStatus(lead) };
    }
    if (!lead.slot || !lead.holdExpiresAt || Date.parse(lead.holdExpiresAt) <= Date.now()) {
      return { error: 'hold_expired' };
    }

    if (!lead.paymentRequired) return confirmWithoutPayment(lead.id);

    const { payment, priceInr } = getServerConfig();
    if (!payment.ready) {
      log.warn('payment.unavailable', { leadId, reason: payment.reason });
      return { error: 'payments_unavailable' };
    }

    const amountPaise = priceInr * 100;
    let orderId = lead.orderId;
    if (!orderId || lead.amountPaise !== amountPaise) {
      const order = await gateway.createOrder({
        amountPaise,
        currency: 'INR',
        receipt: lead.id,
        notes: { leadId: lead.id },
      });
      orderId = order.id;
      log.info('order.created', { leadId, orderId, amountPaise, mode: payment.mode });
    } else {
      log.info('order.reused', { leadId, orderId });
    }

    const expiresAt = holdUntil();
    const { lead: updated, result } = await store().updateLead(leadId, (l, ledger) => {
      // Another server instance attached an order first: use that one, so the
      // lead still has exactly one order (the extra one is never paid).
      if (l.orderId && l.orderId !== orderId && l.amountPaise === amountPaise) orderId = l.orderId;
      if (l.orderId !== orderId) {
        l.orderId = orderId;
        l.amountPaise = amountPaise;
        ledger.indexOrder(orderId, l.id);
        history(l, 'order_created', orderId);
      }
      if (l.paymentStatus !== 'captured') l.paymentStatus = 'order_created';
      l.nextAction = 'Follow up: payment started, not completed';
      // Keep the slot held while the checkout is open.
      const r = ledger.hold(l.slot.id, l.id, expiresAt, capacityFor(l.slot));
      if (r === 'held') l.holdExpiresAt = expiresAt;
      return r;
    });
    if (result !== 'held') return { error: 'slot_taken' };

    return {
      order: {
        id: orderId,
        amountPaise,
        currency: 'INR',
        mode: payment.mode,
        keyId: payment.mode === 'test' ? payment.publicKeyId : null,
        prefill: { name: updated.name, email: updated.email, contact: updated.mobile },
      },
      status: publicStatus(updated),
    };
  });
}

async function confirmWithoutPayment(leadId) {
  const { lead, result } = await store().updateLead(leadId, (l, ledger) => {
    const r = ledger.claim(l.slot.id, l.id, capacityFor(l.slot));
    if (r === 'taken') return r;
    l.paymentStatus = 'not_required';
    l.status = 'Booked';
    l.slotBooked = true;
    l.holdExpiresAt = null;
    l.nextAction = 'Send private intake link; prepare consultation';
    history(l, 'booked_without_payment', l.slot.id);
    return claimConfirmation(l) ? 'send' : r;
  });
  if (result === 'taken') return { error: 'slot_taken' };
  if (result === 'send') background(() => sendConfirmationEmails(lead));
  return { noPayment: true, status: publicStatus(lead) };
}

/**
 * Checkout callback from the browser. A valid signature proves the browser saw
 * this payment, but paid state still comes from Razorpay: the server fetches
 * the payment from Razorpay directly (one call) and books it if it is
 * captured. The webhook confirms the same payment again, harmlessly.
 */
export async function verifyCheckout({ leadId, orderId, paymentId, signature }) {
  const lead = await store().getLead(leadId);
  if (!lead || lead.orderId !== orderId) return { error: 'order_mismatch' };
  if (!gateway.verifyPaymentSignature(orderId, paymentId, signature)) {
    log.warn('checkout.bad_signature', { leadId, orderId });
    return { error: 'bad_signature' };
  }
  if (gateway.isMock() || lead.paymentStatus === 'captured') return { status: publicStatus(lead) };
  try {
    let p = await gateway.fetchPayment(paymentId);
    if (p?.order_id === orderId && p.status === 'authorized') {
      p = await gateway.capturePayment(p.id, p.amount, p.currency);
    }
    if (p?.order_id === orderId && p.status === 'captured') {
      const res = await confirmPayment(paymentFields(p), 'checkout', leadId);
      if (res.lead) return { status: publicStatus(res.lead) };
    }
  } catch (err) {
    log.warn('verify.fetch_failed', { leadId, error: err?.error?.description ?? err.message });
  }
  return { status: publicStatus(lead) };
}

// Per-instance throttle, so polling never hammers Razorpay or the store.
const lastReconcile = new Map();

/**
 * Backstop for a late or missing webhook: asks Razorpay (server to server)
 * for the order's payments. Returns the updated lead when it booked one.
 * Never runs in mock mode.
 */
export async function reconcile(leadId, { force = false, lead: known } = {}) {
  if (gateway.isMock()) return null;
  const lead = known ?? (await store().getLead(leadId));
  if (!lead?.orderId || !['order_created', 'failed'].includes(lead.paymentStatus)) return null;
  const last = lastReconcile.get(leadId) ?? 0;
  if (!force && Date.now() - last < RECONCILE_EVERY_MS) return null;
  lastReconcile.set(leadId, Date.now());
  if (lastReconcile.size > 2000) lastReconcile.clear();
  try {
    const payments = await gateway.orderPayments(lead.orderId);
    let p = payments.find((x) => x.status === 'captured');
    const authorized = !p && payments.find((x) => x.status === 'authorized');
    if (authorized) p = await gateway.capturePayment(authorized.id, authorized.amount, authorized.currency);
    if (p?.status === 'captured') return (await confirmPayment(paymentFields(p), 'reconcile', leadId)).lead ?? null;
  } catch (err) {
    log.warn('reconcile.failed', { leadId, error: err?.error?.description ?? err.message });
  }
  return null;
}

/**
 * Reconciles every lead with an open, unpaid order. A backstop for missed
 * webhooks (for example, the browser closed after paying while webhooks are
 * not yet registered). Safe to run on a schedule: confirmation is idempotent.
 */
export async function reconcileOpenOrders() {
  const open = (await store().listLeads()).filter(
    (l) => l.orderId && ['order_created', 'failed'].includes(l.paymentStatus),
  );
  let confirmed = 0;
  for (const l of open) if (await reconcile(l.id, { force: true, lead: l })) confirmed += 1;
  return { checked: open.length, confirmed };
}

function paymentFields(p) {
  return {
    paymentId: p.id,
    orderId: p.order_id,
    amount: p.amount,
    currency: p.currency,
    leadIdHint: p.notes?.leadId ?? null,
  };
}

/**
 * Marks a lead paid and books its slot, in one write. Idempotent: the same
 * payment arriving twice (webhook retry, checkout check, reconcile) changes
 * nothing the second time. Emails and alerts go out after the response.
 */
export async function confirmPayment({ paymentId, orderId, amount, currency, leadIdHint }, source, knownLeadId) {
  const leadId = knownLeadId ?? (await store().findLeadId({ orderId })) ?? leadIdHint;
  const res = leadId
    ? await store().updateLead(leadId, (l, ledger) => {
        if (l.orderId !== orderId) return 'unmatched';
        ledger.indexPayment(paymentId, l.id);
        if (amount !== l.amountPaise || currency !== 'INR') {
          l.needsAttention = 'amount_mismatch';
          history(l, 'payment_amount_mismatch', { paymentId, amount, currency, source });
          return 'mismatch';
        }
        if (l.paymentId === paymentId && l.paymentStatus !== 'none') return 'already';
        if (l.paymentId && l.paymentId !== paymentId) {
          l.extraPayments = [...new Set([...(l.extraPayments ?? []), paymentId])];
          l.needsAttention = 'duplicate_payment';
          history(l, 'duplicate_payment', { paymentId, source });
          return 'duplicate';
        }

        l.paymentStatus = 'captured';
        l.paymentId = paymentId;
        l.paidAt = now();
        l.status = 'Booked';
        history(l, 'payment_captured', { paymentId, source });

        const claim = l.slot ? ledger.claim(l.slot.id, l.id, capacityFor(l.slot)) : 'taken';
        if (claim === 'taken') {
          // Paid, but the slot went to someone else (hold expired). Keep the lead.
          l.slotBooked = false;
          l.holdExpiresAt = null;
          ledger.release(l.id);
          l.needsAttention = 'slot_unavailable';
          l.nextAction = 'Offer a new slot or a full refund';
          history(l, 'slot_unavailable_after_payment', l.slot?.id);
          return 'paid_no_slot';
        }
        l.slotBooked = true;
        l.holdExpiresAt = null;
        l.nextAction = 'Send private intake link; prepare consultation';
        history(l, 'slot_booked', l.slot.id);
        return claimConfirmation(l) ? 'booked' : 'already';
      })
    : { lead: null, result: 'unmatched' };

  const { lead, result } = res;
  if (!lead || result === 'unmatched') {
    log.warn('payment.unmatched', { orderId, paymentId, source });
    background(() => alertOwner('unmatched_payment', null, { orderId, paymentId }));
    return { result: 'unmatched', lead: null };
  }
  log.info('payment.confirmed', { leadId, paymentId, source, result });
  if (result === 'booked') background(() => sendConfirmationEmails(lead));
  if (result === 'paid_no_slot') {
    background(async () => {
      await alertOwner('paid_no_slot', lead, { paymentId });
      await sendEmail({
        to: lead.email,
        subject: 'We have your payment: choosing your slot',
        template: 'paid-no-slot',
        data: { leadId: lead.id, support: supportContact() },
      });
    });
  }
  if (result === 'duplicate' || result === 'mismatch') {
    background(() => alertOwner(`payment_${result}`, lead, { paymentId }));
  }
  return { result, lead };
}

async function paymentFailed({ orderId, paymentId, reason }) {
  const leadId = await store().findLeadId({ orderId });
  if (!leadId) return;
  await store().updateLead(leadId, (l, ledger) => {
    if (['captured', 'refund_pending', 'refunded'].includes(l.paymentStatus)) return;
    l.paymentStatus = 'failed';
    l.lastPaymentError = reason ?? 'Payment failed';
    // Failure leaves the lead New and frees the slot for others.
    ledger.release(l.id);
    l.holdExpiresAt = null;
    l.nextAction = 'Follow up: payment failed';
    history(l, 'payment_failed', { paymentId, reason });
  });
  log.info('payment.failed', { leadId, paymentId });
}

function supportContact() {
  const p = getPublicConfig();
  return { phone: p.supportPhone, whatsapp: p.supportWhatsApp, email: p.supportEmail };
}

/**
 * Marks the confirmation as sent, inside the booking write, so two
 * confirmations of the same booking never both send. True the first time.
 */
function claimConfirmation(l) {
  if (l.confirmationSentAt) return false;
  l.confirmationSentAt = now();
  l.intakeLinkSentAt = l.confirmationSentAt;
  history(l, 'confirmation_sent');
  return true;
}

/** Confirmation and private-intake emails. Runs after the response. */
async function sendConfirmationEmails(lead) {
  const p = getPublicConfig();
  await sendEmail({
    to: lead.email,
    subject: 'Your HLS blueprint consultation is booked',
    template: 'booking-confirmed',
    data: {
      slot: lead.slot && `${lead.slot.dayLabel}, ${lead.slot.timeLabel}`,
      amountInr: lead.paymentStatus === 'captured' ? lead.amountPaise / 100 : null,
      paymentId: lead.paymentId,
      prepare: ['Previous marksheets', 'Your current or intended attempt', 'Recent mock papers'],
      durationMin: p.durationMin,
      support: supportContact(),
    },
  });
  // Private intake: a separate, access-controlled link, sent by email.
  await sendEmail({
    to: lead.email,
    subject: 'Your private link for marksheets and mock papers',
    template: 'private-intake-link',
    data: { link: intakeLink(lead.id) },
  });
}

/* ------------------------------------------------------------------ */
/* Webhook                                                             */
/* ------------------------------------------------------------------ */

/**
 * Razorpay webhook. Verifies X-Razorpay-Signature over the raw body, then
 * de-duplicates on the event id. An event is marked seen only after it is
 * processed, so a failure makes Razorpay retry it.
 */
export async function handleWebhook(rawBody, signature, eventIdHeader) {
  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    log.warn('webhook.bad_signature', {});
    return { status: 400, body: { error: 'invalid signature' } };
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid body' } };
  }
  const eventId = eventIdHeader || `body_${createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;
  if (await store().eventSeen(eventId)) {
    log.info('webhook.duplicate', { eventId, type: event.event });
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  switch (event.event) {
    case 'payment.authorized':
      // Accounts without auto-capture: capture here, booking follows on payment.captured.
      if (!gateway.isMock() && payment) {
        try {
          await gateway.capturePayment(payment.id, payment.amount, payment.currency);
        } catch (err) {
          log.warn('webhook.capture_failed', { paymentId: payment.id, error: err?.error?.description ?? err.message });
        }
      }
      break;
    case 'payment.captured':
    case 'order.paid':
      if (payment) await confirmPayment(paymentFields(payment), `webhook:${event.event}`);
      break;
    case 'payment.failed':
      if (payment) {
        await paymentFailed({
          orderId: payment.order_id,
          paymentId: payment.id,
          reason: payment.error_description ?? null,
        });
      }
      break;
    case 'refund.created':
    case 'refund.processed':
    case 'refund.failed':
      if (refund) await refundEvent(refund, event.event);
      break;
    default:
      log.info('webhook.ignored', { type: event.event });
  }
  await store().markEvent(eventId);
  return { status: 200, body: { ok: true } };
}

/* ------------------------------------------------------------------ */
/* Refunds and admin                                                   */
/* ------------------------------------------------------------------ */

async function refundEvent(refund, type) {
  const leadId = await store().findLeadId({ paymentId: refund.payment_id });
  if (!leadId) return;
  await store().updateLead(leadId, (l, ledger) => {
    if (refund.payment_id !== l.paymentId) {
      history(l, `extra_payment_${type}`, refund.id);
      return;
    }
    if (type === 'refund.failed') {
      l.paymentStatus = 'captured';
      l.needsAttention = 'refund_failed';
    } else if (type === 'refund.processed') {
      l.paymentStatus = 'refunded';
      l.status = 'Refunded';
      l.refundedAt = now();
      if (l.slot) ledger.unbook(l.slot.id, l.id);
      l.slotBooked = false;
      l.needsAttention = null;
      l.nextAction = 'None: refunded';
    } else if (l.paymentStatus !== 'refunded') {
      l.paymentStatus = 'refund_pending';
    }
    l.refundId = refund.id;
    history(l, type, refund.id);
  });
  log.info('refund.event', { leadId, type, refundId: refund.id });
}

/** Full refund of a lead's payment. Admin only. */
export async function refundLead(leadId, reason) {
  const lead = await store().getLead(leadId);
  if (!lead) return { error: 'lead_unknown' };
  if (!lead.paymentId || lead.paymentStatus !== 'captured') return { error: 'not_refundable' };
  const refund = await gateway.refundPayment(lead.paymentId, lead.amountPaise, { leadId, reason: reason ?? '' });
  await store().updateLead(leadId, (l) => {
    l.paymentStatus = refund.status === 'processed' ? 'refunded' : 'refund_pending';
    l.refundId = refund.id;
    history(l, 'refund_requested', { refundId: refund.id, reason });
  });
  if (gateway.isMock()) {
    // Razorpay sends refund.processed; the mock delivers the same signed event.
    await deliverMockWebhook('refund.processed', { refund: { entity: refund } });
  } else if (refund.status === 'processed') {
    await refundEvent(refund, 'refund.processed');
  }
  return { status: publicStatus(await store().getLead(leadId)) };
}

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

/* ------------------------------------------------------------------ */
/* Mock checkout (RAZORPAY_MODE=mock only)                             */
/* ------------------------------------------------------------------ */

async function deliverMockWebhook(type, payload) {
  const raw = JSON.stringify({ entity: 'event', event: type, payload, created_at: Math.floor(Date.now() / 1000) });
  const res = await handleWebhook(raw, gateway.mockSign('webhook', raw), gateway.mockId('evt'));
  if (res.status !== 200) log.error('mock.webhook_failed', { type, status: res.status });
}

/**
 * Simulates what Razorpay Checkout and Razorpay's servers would do. The
 * webhook is delivered a moment later, as in real life, so the confirmation
 * page has to wait for it rather than trust the browser.
 */
export async function mockCheckout(leadId, outcome) {
  if (!gateway.isMock()) return { error: 'not_mock' };
  const lead = await store().getLead(leadId);
  if (!lead?.orderId) return { error: 'no_order' };
  const paymentId = gateway.mockId('pay');
  const entity = {
    id: paymentId,
    entity: 'payment',
    order_id: lead.orderId,
    amount: lead.amountPaise,
    currency: 'INR',
    notes: { leadId: lead.id },
  };
  if (outcome === 'fail') {
    await deliverMockWebhook('payment.failed', {
      payment: { entity: { ...entity, status: 'failed', error_description: 'Simulated failure (mock)' } },
    });
    return { failed: true };
  }
  const captured = { payment: { entity: { ...entity, status: 'captured' } } };
  setTimeout(() => {
    deliverMockWebhook('payment.captured', captured)
      .then(() => deliverMockWebhook('order.paid', { ...captured, order: { entity: { id: lead.orderId } } }))
      .catch((err) => log.error('mock.webhook_error', { error: err.message }));
  }, 1200);
  return {
    razorpay_order_id: lead.orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: gateway.mockSign('checkout', `${lead.orderId}|${paymentId}`),
  };
}

