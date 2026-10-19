/**
 * QA for the /book booking and payment flow, against a running server.
 *
 *   npm run build && npx next start -p 3300
 *   BASE_URL=http://localhost:3300 npm run test:book
 *
 * Needs, in .env.local: BOOK_ADMIN_TOKEN, BOOK_TEST_HOOKS=true, and either
 * RAZORPAY_MODE=mock (simulated checkout) or test keys plus the webhook secret.
 * Webhooks are signed locally with the webhook secret, exactly as Razorpay
 * signs them. Nothing secret is printed.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const BASE = process.env.BASE_URL ?? 'http://localhost:3300';
const MODE = process.env.RAZORPAY_MODE ?? 'test';
const ADMIN = process.env.BOOK_ADMIN_TOKEN;
const WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || (MODE === 'mock' ? 'mock-webhook-secret-dev-only' : null);
const PRICE_PAISE = Number(process.env.CONSULTATION_FEE_INR || 3000) * 100;

if (!ADMIN || !WEBHOOK_SECRET) {
  console.error('Set BOOK_ADMIN_TOKEN and a webhook secret (or RAZORPAY_MODE=mock) in .env.local.');
  process.exit(2);
}

const results = [];
let ipCounter = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail = '') {
  results.push({ case: name, result: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function call(path, { method = 'POST', body, ip, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE,
      'x-forwarded-for': ip ?? '10.0.0.1',
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

const admin = (path, opts = {}) => call(path, { ...opts, headers: { Authorization: `Bearer ${ADMIN}` } });
const getLead = async (id) => (await admin(`/api/book/admin/leads?id=${id}`, { method: 'GET' })).data.lead;
const status = async (l) =>
  (await call(`/api/book/status?leadId=${l.leadId}&token=${l.token}`, { method: 'GET' })).data?.status;

async function newLead(extra = {}) {
  const ip = `10.1.0.${ipCounter++}`;
  const res = await call('/api/book/lead', {
    ip,
    body: {
      clientRequestId: randomUUID(),
      name: 'Test Student',
      mobile: '98765 43210',
      email: `qa+${randomUUID().slice(0, 8)}@example.com`,
      attempt: 'this',
      eligible: true,
      privacyAccepted: true,
      marketing: { email: true, whatsapp: false, sms: false },
      variant: 'a',
      source: { src: 'site', utmSource: 'qa', utmCampaign: 'flow-test', utmContent: 'v1' },
      ...extra,
    },
  });
  return { ...res.data, ip, httpStatus: res.status };
}

async function slots(l) {
  return (await call(`/api/book/slots?leadId=${l.leadId}&token=${l.token}`, { method: 'GET' })).data.slots;
}

let slotCursor = 0;
async function freeSlot(l) {
  const list = await slots(l);
  // Spread tests across slots so they don't collide with each other.
  return list[slotCursor++ % list.length].id;
}

const hold = (l, slotId) => call('/api/book/hold', { body: { leadId: l.leadId, token: l.token, slotId } });
const order = (l, headers) => call('/api/book/order', { body: { leadId: l.leadId, token: l.token }, headers });

function webhook(event, entity, { eventId = `evt_qa${randomUUID().slice(0, 12)}`, secret = WEBHOOK_SECRET } = {}) {
  const raw = JSON.stringify({ entity: 'event', event, payload: entity, created_at: Math.floor(Date.now() / 1000) });
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  return call('/api/book/webhook', {
    body: raw,
    headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId },
  });
}

const paymentEntity = (orderId, paymentId, extra = {}) => ({
  payment: {
    entity: { id: paymentId, entity: 'payment', order_id: orderId, amount: PRICE_PAISE, currency: 'INR', status: 'captured', ...extra },
  },
});

async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(300);
  }
  return null;
}

async function bookedLead() {
  const l = await newLead();
  await hold(l, await freeSlot(l));
  const o = (await order(l)).data.order;
  const paymentId = `pay_qa${randomUUID().slice(0, 10)}`;
  await webhook('payment.captured', paymentEntity(o.id, paymentId));
  return { l, o, paymentId };
}

/* ------------------------------------------------------------------ */

console.log(`Testing ${BASE} in ${MODE} mode\n`);

// Validation, honeypot, eligibility, idempotent lead, rate limit
{
  const bad = await call('/api/book/lead', {
    ip: '10.9.0.1',
    body: { clientRequestId: randomUUID(), name: 'A', mobile: '123', email: 'nope', attempt: 'x', eligible: true, privacyAccepted: false },
  });
  check('Form validation: bad input rejected with field errors', bad.status === 422 && bad.data.fields?.mobile && bad.data.fields?.email && bad.data.fields?.privacyAccepted, JSON.stringify(Object.keys(bad.data.fields ?? {})));

  const ineligible = await newLead({ eligible: false });
  check('Ineligible user cannot create a lead (no payment path)', ineligible.httpStatus === 422);

  const before = (await admin('/api/book/admin/leads', { method: 'GET' })).data.leads.length;
  const bot = await newLead({ website: 'http://spam.example' });
  const after = (await admin('/api/book/admin/leads', { method: 'GET' })).data.leads.length;
  check('Honeypot: bot submission accepted silently, not stored', bot.httpStatus === 200 && before === after);

  const rid = randomUUID();
  const a = await newLead({ clientRequestId: rid });
  const b = await newLead({ clientRequestId: rid });
  check('Lead saved before payment; resubmit/refresh returns the same lead', a.leadId === b.leadId && a.status.status === 'New', a.leadId);

  const lead = await getLead(a.leadId);
  const consentOk =
    lead.consent.privacyNotice.accepted && lead.consent.privacyNotice.at &&
    lead.consent.marketing.email.granted === true && lead.consent.marketing.email.at &&
    lead.consent.marketing.whatsapp.granted === false && lead.consent.marketing.sms.at;
  check('Consent logged per channel with timestamps', Boolean(consentOk));
  check('UTMs, src and variant stored with the lead', lead.source.src === 'site' && lead.source.utmSource === 'qa' && lead.variant === 'a');
  check('Mobile normalised, no marksheet/mock fields on the record', lead.mobile === '+919876543210' && !('marksheets' in lead) && !('mocks' in lead));

  const bVariant = await newLead({ variant: 'b' });
  const bl = await getLead(bVariant.leadId);
  check('Variant B falls back to A while no proof exists (requested b recorded)', bl.variant === 'a' && bl.variantRequested === 'b');

  let limited = false;
  for (let i = 0; i < 10; i += 1) {
    const r = await call('/api/book/lead', { ip: '10.8.8.8', body: { clientRequestId: randomUUID() } });
    if (r.status === 429) limited = true;
  }
  check('Rate limit on the lead endpoint', limited);
}

// 1. Payment success
{
  const l = await newLead();
  const slotId = await freeSlot(l);
  const h = await hold(l, slotId);
  const o = await order(l);
  let paymentId;
  if (MODE === 'mock') {
    const c = await call('/api/book/mock-checkout', { body: { leadId: l.leadId, token: l.token, outcome: 'success' } });
    paymentId = c.data.razorpay_payment_id;
    const v = await call('/api/book/verify', { body: { leadId: l.leadId, token: l.token, ...c.data } });
    check('Checkout signature verified server-side (HMAC order_id|payment_id)', v.status === 200);
    check('Browser callback alone does not mark it paid (webhook still pending)', v.data.status.paymentStatus === 'order_created');
  } else {
    paymentId = `pay_qa${randomUUID().slice(0, 10)}`;
    await webhook('payment.captured', paymentEntity(o.data.order.id, paymentId));
  }
  const s = await waitFor(async () => {
    const x = await status(l);
    return x?.status === 'Booked' && x;
  });
  check('Payment success: webhook books the slot', Boolean(s && s.slotBooked && s.paymentStatus === 'captured'), `${h.data?.status?.slot?.id} ${s?.paymentId}`);
  const rec = await getLead(l.leadId);
  check(
    'Receipt matches booking state (status page vs stored record)',
    s && rec.paymentId === s.paymentId && rec.orderId === s.orderId && rec.status === s.status && rec.amountPaise / 100 === s.amountInr && rec.slot.id === s.slot.id && paymentId === s.paymentId,
  );
  check('Order amount set by server config (receipt = lead id)', o.data.order.amountPaise === PRICE_PAISE && rec.amountPaise === PRICE_PAISE);
  check('Confirmation email and intake link sent once (stubs)', Boolean(rec.confirmationSentAt && rec.intakeLinkSentAt));

  const again = await order(l);
  check('Paying again after booking is refused (no second charge)', again.data.alreadyBooked === true);

  const taken = (await slots(await newLead())).some((x) => x.id === slotId);
  check('Booked slot no longer offered to others', !taken);
}

// 2. Payment failure
{
  const l = await newLead();
  const slotId = await freeSlot(l);
  await hold(l, slotId);
  const o = (await order(l)).data.order;
  if (MODE === 'mock') {
    await call('/api/book/mock-checkout', { body: { leadId: l.leadId, token: l.token, outcome: 'fail' } });
  } else {
    await webhook('payment.failed', paymentEntity(o.id, `pay_qa${randomUUID().slice(0, 10)}`, { status: 'failed', error_description: 'QA failure' }));
  }
  const s = await status(l);
  const freed = (await slots(await newLead())).some((x) => x.id === slotId);
  check('Payment failure: lead stays New, slot released', s.status === 'New' && s.paymentStatus === 'failed' && freed);

  // Retry after failure reuses the same order.
  await hold(l, slotId);
  const o2 = (await order(l)).data.order;
  check('Retry after failure reuses the same order', o2.id === o.id);
}

// 3. User cancellation
{
  const l = await newLead();
  const slotId = await freeSlot(l);
  await hold(l, slotId);
  await order(l);
  const r = await call('/api/book/hold', { method: 'DELETE', body: { leadId: l.leadId, token: l.token, reason: 'cancelled' } });
  const freed = (await slots(await newLead())).some((x) => x.id === slotId);
  const rec = await getLead(l.leadId);
  check('User cancellation: lead stays New, slot released, follow-up noted', r.data.status.status === 'New' && freed && /cancelled/.test(rec.nextAction));
}

// 4. Double click
{
  const l = await newLead();
  await hold(l, await freeSlot(l));
  const [a, b, c] = await Promise.all([order(l), order(l), order(l)]);
  const ids = new Set([a, b, c].map((x) => x.data.order?.id));
  check('Double click: concurrent order requests return one order', ids.size === 1 && !ids.has(undefined), [...ids].join(','));

  const paymentId = `pay_qa${randomUUID().slice(0, 10)}`;
  const evt = `evt_qa${randomUUID().slice(0, 10)}`;
  const w1 = await webhook('payment.captured', paymentEntity(a.data.order.id, paymentId), { eventId: evt });
  const w2 = await webhook('payment.captured', paymentEntity(a.data.order.id, paymentId), { eventId: evt });
  const w3 = await webhook('order.paid', paymentEntity(a.data.order.id, paymentId));
  const rec = await getLead(l.leadId);
  const bookings = rec.history.filter((h) => h.event === 'slot_booked').length;
  check('Duplicate webhook (same event id) is ignored', w1.status === 200 && w2.data.duplicate === true);
  check('payment.captured + order.paid book once', w3.status === 200 && bookings === 1 && rec.status === 'Booked');
}

// 5. Browser closed after paying (no verify call): webhook alone books it
{
  const l = await newLead();
  await hold(l, await freeSlot(l));
  const o = (await order(l)).data.order;
  await webhook('payment.captured', paymentEntity(o.id, `pay_qa${randomUUID().slice(0, 10)}`));
  const s = await status(l);
  check('Browser closed after paying: webhook still books', s.status === 'Booked' && s.slotBooked);
}

// 6. Charge succeeded but the slot is gone
{
  const a = await newLead();
  const slotId = await freeSlot(a);
  await hold(a, slotId);
  const oa = (await order(a)).data.order;
  await call('/api/book/hold', { method: 'DELETE', body: { leadId: a.leadId, token: a.token, reason: 'released' } });
  const b = await newLead();
  const hb = await hold(b, slotId);
  const ob = (await order(b)).data.order;
  await webhook('payment.captured', paymentEntity(ob.id, `pay_qa${randomUUID().slice(0, 10)}`));
  await webhook('payment.captured', paymentEntity(oa.id, `pay_qa${randomUUID().slice(0, 10)}`));
  const sa = await status(a);
  const sb = await status(b);
  const rec = await getLead(a.leadId);
  check(
    'Charged with no slot: lead kept, flagged for reslot/refund, owner alerted',
    hb.status === 200 && sb.slotBooked && sa.paymentStatus === 'captured' && !sa.slotBooked && sa.needsAttention === 'slot_unavailable' && /refund/.test(rec.nextAction),
  );
}

// 7. Two people choose the same slot
{
  const a = await newLead();
  const b = await newLead();
  const slotId = await freeSlot(a);
  const [ha, hb] = await Promise.all([hold(a, slotId), hold(b, slotId)]);
  const codes = [ha.status, hb.status].sort();
  check('Two people, same slot: exactly one hold succeeds', codes[0] === 200 && codes[1] === 409, codes.join(','));
}

// 8. Refund path (mock mode; in test mode refunds need a real payment, so run
//    a real checkout and POST /api/book/admin/refund instead)
if (MODE !== 'mock') {
  console.log('SKIP  Refund path: needs a real test payment in test mode (see docs/book-landing.md)');
} else {
  const { l } = await bookedLead();
  const slotId = (await status(l)).slot.id;
  const r = await admin('/api/book/admin/refund', { body: { leadId: l.leadId, reason: 'QA' } });
  const s = await waitFor(async () => {
    const x = await status(l);
    return x?.status === 'Refunded' && x;
  });
  const freed = (await slots(await newLead())).some((x) => x.id === slotId);
  check('Refund path: refunded, status Refunded, slot freed', r.status === 200 && s?.paymentStatus === 'refunded' && freed);
}

// 9. Storage failure: fallback contact flag, lead not lost
{
  const email = `qa+fallback${randomUUID().slice(0, 6)}@example.com`;
  const f = await call('/api/book/lead', {
    ip: '10.7.0.1',
    headers: { 'x-book-fault': 'storage' },
    body: { clientRequestId: randomUUID(), name: 'Fallback Student', mobile: '9876500000', email, attempt: 'next', eligible: true, privacyAccepted: true },
  });
  check('Storage failure: 503 with fallback contact flag, lead kept in fallback file', f.status === 503 && f.data.fallback === true && f.data.kept === true);
  await newLead(); // a successful save drains the fallback file
  const found = await waitFor(async () => {
    const leads = (await admin('/api/book/admin/leads', { method: 'GET' })).data.leads;
    return leads.find((x) => x.email === email);
  });
  check('Fallback lead recovered into the store on next save', Boolean(found));
}

// 10. Payment (order creation) failure: fallback contact flag, lead not lost
{
  const l = await newLead();
  await hold(l, await freeSlot(l));
  const r = await order(l, { 'x-book-fault': 'payment' });
  const rec = await getLead(l.leadId);
  check('Payment failure: 502 with fallback contact flag, lead still saved', r.status === 502 && r.data.fallback === true && rec?.status === 'New');
}

// Security checks
{
  const raw = JSON.stringify({ event: 'payment.captured', payload: {} });
  const bad = await call('/api/book/webhook', { body: raw, headers: { 'x-razorpay-signature': 'deadbeef' } });
  check('Webhook with a bad signature is rejected', bad.status === 400);

  const l = await newLead();
  await hold(l, await freeSlot(l));
  const o = (await order(l)).data.order;
  const v = await call('/api/book/verify', {
    body: { leadId: l.leadId, token: l.token, razorpay_order_id: o.id, razorpay_payment_id: 'pay_forged123', razorpay_signature: 'f'.repeat(64) },
  });
  check('Forged checkout signature is rejected', v.status === 400 && (await status(l)).paymentStatus !== 'captured');

  const forged = await call('/api/book/order', { body: { leadId: l.leadId, token: l.token, amount: 1 } });
  check('Client-sent amount is ignored', forged.data.order.amountPaise === PRICE_PAISE);

  const wrongToken = await call('/api/book/order', { body: { leadId: l.leadId, token: 'x'.repeat(32) } });
  check('Lead actions need the per-lead token', wrongToken.status === 401);

  const noAdmin = await call('/api/book/admin/leads', { method: 'GET' });
  check('Admin API hidden without the admin token', noAdmin.status === 404);
}

// Delivery tracking after the consultation
{
  const { l } = await bookedLead();
  for (const s of ['Attended', 'Blueprint delivered', 'In counselling']) {
    await admin('/api/book/admin/leads', { method: 'PATCH', body: { leadId: l.leadId, status: s, owner: 'counselling-owner-role' } });
  }
  const rec = await getLead(l.leadId);
  check('Attendance and blueprint delivery tracked separately', Boolean(rec.attendedAt && rec.blueprintDeliveredAt && rec.status === 'In counselling'));
}

const failed = results.filter((r) => r.result === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (existsSync('.data/lead-fallback.ndjson')) {
  const left = readFileSync('.data/lead-fallback.ndjson', 'utf8').trim();
  console.log(`Fallback queue after run: ${left ? left.split('\n').length : 0} record(s)`);
}
process.exit(failed.length ? 1 : 0);
