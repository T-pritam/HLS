/**
 * QA for the /sip booking flow (details saved, then a time booked in Calendly),
 * against a running server.
 *
 *   npm run build && npx next start -p 3300
 *   BASE_URL=http://localhost:3300 npm run test:book
 *
 * Needs BOOK_ADMIN_TOKEN (in .env.local or the environment). Calendly itself
 * is not called: the test sends the same message the Calendly calendar sends
 * to the page. Every lead it creates is named "QA Test Student". Nothing
 * secret is printed.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const BASE = process.env.BASE_URL ?? 'http://localhost:3300';
const ADMIN = process.env.BOOK_ADMIN_TOKEN;

if (!ADMIN) {
  console.error('Set BOOK_ADMIN_TOKEN (in .env.local or the environment).');
  process.exit(2);
}

const results = [];
let ipCounter = 10;

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
const getLead = async (id) => (await admin(`/api/book/admin/leads?id=${id}`, { method: 'GET' })).data?.lead;

function leadBody(extra = {}) {
  return {
    clientRequestId: randomUUID(),
    name: 'QA Test Student',
    mobile: '98765 43210',
    email: `qa+${randomUUID().slice(0, 8)}@example.com`,
    attempt: 'this',
    eligible: true,
    privacyAccepted: true,
    marketing: { email: true, whatsapp: false, sms: false },
    variant: 'a',
    source: { src: 'site', utmSource: 'qa', utmCampaign: 'flow-test', utmContent: 'v1' },
    ...extra,
  };
}

async function newLead(extra = {}) {
  const ip = `10.1.0.${ipCounter++}`;
  const res = await call('/api/book/lead', { ip, body: leadBody(extra) });
  return { ...res.data, ip, httpStatus: res.status };
}

const fakeId = () => randomUUID().replace(/-/g, '').slice(0, 20);
function calendlyUris() {
  const eventUri = `https://api.calendly.com/scheduled_events/${fakeId()}`;
  return { eventUri, inviteeUri: `${eventUri}/invitees/${fakeId()}` };
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log(`Testing ${BASE}\n`);

  const health = await call('/api/book/health', { method: 'GET' });
  check('health answers', health.status === 200, `store=${health.data?.store}`);
  check('health shows the Calendly setting', typeof health.data?.calendlyConfigured === 'boolean');

  // Details are saved.
  const l = await newLead();
  check('lead saved', l.httpStatus === 200 && l.leadId?.startsWith('lead_') && l.token?.length === 32);
  const stored = await getLead(l.leadId);
  check('lead stored as New', stored?.status === 'New' && stored?.slotBooked === false);
  check('no payment fields on the lead', stored && !('paymentStatus' in stored) && !('orderId' in stored));

  // Same browser request twice -> one lead.
  const body = leadBody();
  const a = await call('/api/book/lead', { ip: '10.2.0.1', body });
  const b = await call('/api/book/lead', { ip: '10.2.0.1', body });
  check('double submit saves one lead', a.data?.leadId && a.data.leadId === b.data?.leadId);

  // Validation and the honeypot.
  const bad = await call('/api/book/lead', { ip: '10.2.0.2', body: leadBody({ mobile: '12345', email: 'nope' }) });
  check('invalid details rejected', bad.status === 422 && bad.data?.fields?.mobile && bad.data?.fields?.email);
  const notEligible = await call('/api/book/lead', { ip: '10.2.0.3', body: leadBody({ eligible: false }) });
  check('non-repeater rejected', notEligible.status === 422);
  const bot = await call('/api/book/lead', { ip: '10.2.0.4', body: leadBody({ website: 'spam.example' }) });
  check('honeypot answers like success and saves nothing', bot.status === 200 && bot.data?.leadId === 'lead_ignored');
  const form = await call('/api/book/lead', { ip: '10.2.0.5', body: 'name=x', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  check('non-JSON post refused', form.status === 415);
  const cross = await call('/api/book/lead', { ip: '10.2.0.6', body: leadBody(), headers: { Origin: 'https://evil.example' } });
  check('cross-site post refused', cross.status === 403);

  // Status for the page after a refresh.
  const st = await call(`/api/book/status?leadId=${l.leadId}&token=${l.token}`, { method: 'GET', ip: l.ip });
  check('status with the lead token', st.status === 200 && st.data?.status?.status === 'New');
  const stBad = await call(`/api/book/status?leadId=${l.leadId}&token=${'x'.repeat(32)}`, { method: 'GET', ip: l.ip });
  check('status with a wrong token is hidden', stBad.status === 404);

  // Calendly booking.
  const uris = calendlyUris();
  const wrongToken = await call('/api/book/scheduled', { ip: l.ip, body: { leadId: l.leadId, token: 'y'.repeat(32), ...uris } });
  check('booking with a wrong token refused', wrongToken.status === 404);
  const notCalendly = await call('/api/book/scheduled', {
    ip: l.ip,
    body: { leadId: l.leadId, token: l.token, eventUri: 'https://evil.example/x', inviteeUri: 'https://evil.example/x/y' },
  });
  check('non-Calendly address refused', notCalendly.status === 422);
  const mixed = await call('/api/book/scheduled', {
    ip: l.ip,
    body: { leadId: l.leadId, token: l.token, eventUri: uris.eventUri, inviteeUri: calendlyUris().inviteeUri },
  });
  check('invitee from another event refused', mixed.status === 422);

  const booked = await call('/api/book/scheduled', { ip: l.ip, body: { leadId: l.leadId, token: l.token, ...uris } });
  check('booking recorded', booked.status === 200 && booked.data?.status?.slotBooked === true && booked.data.status.status === 'Booked');
  const after = await getLead(l.leadId);
  check(
    'lead marked booked with the Calendly addresses',
    after?.status === 'Booked' && after.calendly?.eventUri === uris.eventUri && after.calendly?.inviteeUri === uris.inviteeUri,
  );
  check('intake link marked as sent once', Boolean(after?.intakeLinkSentAt));

  const again = await call('/api/book/scheduled', { ip: l.ip, body: { leadId: l.leadId, token: l.token, ...uris } });
  const after2 = await getLead(l.leadId);
  check(
    'same booking twice changes nothing',
    again.status === 200 && after2?.history?.filter((h) => h.event === 'booked_on_calendly').length === 1,
  );

  // Staff status is never moved back by a reschedule.
  await admin('/api/book/admin/leads', { method: 'PATCH', body: { leadId: l.leadId, status: 'Attended' } });
  const resched = calendlyUris();
  await call('/api/book/scheduled', { ip: l.ip, body: { leadId: l.leadId, token: l.token, ...resched } });
  const after3 = await getLead(l.leadId);
  check('reschedule keeps the staff status', after3?.status === 'Attended' && after3.calendly?.eventUri === resched.eventUri);

  // Admin needs the token.
  const noAdmin = await call('/api/book/admin/leads', { method: 'GET' });
  check('admin list hidden without token', noAdmin.status === 404);

  // Removed payment and slot routes are gone.
  for (const path of ['/api/book/order', '/api/book/verify', '/api/book/webhook', '/api/book/hold', '/api/book/slots', '/api/book/mock-checkout']) {
    const r = await call(path, { method: path === '/api/book/slots' ? 'GET' : 'POST', body: path === '/api/book/slots' ? undefined : {} });
    check(`removed: ${path}`, r.status === 404 || r.status === 405, `HTTP ${r.status}`);
  }
  for (const path of ['/sip/refund', '/sip/confirmation']) {
    const r = await fetch(BASE + path);
    check(`removed page: ${path}`, r.status === 404, `HTTP ${r.status}`);
  }

  const failed = results.filter((r) => r.result === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
