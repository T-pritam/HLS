import 'server-only';
import { randomBytes } from 'node:crypto';
import { getServerConfig } from '../config';
import { INDEX_TYPES, clone, empty, ledger, pruneHolds } from './ledger';

/**
 * Lead store on a Google Sheet, through the Apps Script web app in
 * scripts/google-sheets/Code.gs (setup: docs/google-sheets-setup.md).
 *
 * Works on serverless hosts such as Vercel. Every change is a read, then a
 * commit that the script accepts only if nothing else was written in between
 * (a version number checked under the script's lock); on a clash it retries.
 * That keeps slot holds and claims safe across server instances. Meant for low
 * volume: each call takes about a second.
 */

const TIMEOUT_MS = 25000;
const RETRIES = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(action, payload = {}) {
  const { sheetsUrl, sheetsSecret } = getServerConfig();
  if (!sheetsUrl || !sheetsSecret) throw new Error('Google Sheets store is not configured');
  // Apps Script answers a POST with a redirect to the result; fetch follows it.
  const res = await fetch(sheetsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: sheetsSecret, action, ...payload }),
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheets store: unexpected response (HTTP ${res.status})`);
  }
  if (!data.ok && !data.conflict) throw new Error(`Google Sheets store: ${data.error ?? 'error'}`);
  return data;
}

function toState(data) {
  const state = empty();
  for (const lead of data.leads ?? []) state.leads[lead.id] = lead;
  for (const [type, key, value] of data.index ?? []) {
    if (!INDEX_TYPES.includes(type)) continue;
    try {
      state[type][key] = JSON.parse(value);
    } catch {
      state[type][key] = value;
    }
  }
  return state;
}

function snapshot(state) {
  const leads = {};
  for (const [id, lead] of Object.entries(state.leads)) leads[id] = JSON.stringify(lead);
  const index = {};
  for (const type of INDEX_TYPES) {
    for (const [key, value] of Object.entries(state[type])) index[`${type}\u0000${key}`] = JSON.stringify(value);
  }
  return { leads, index };
}

function diff(before, state) {
  const after = snapshot(state);
  const leads = Object.keys(after.leads)
    .filter((id) => after.leads[id] !== before.leads[id])
    .map((id) => state.leads[id]);
  const set = [];
  const del = [];
  for (const [k, v] of Object.entries(after.index)) {
    if (before.index[k] !== v) set.push([...k.split('\u0000'), v]);
  }
  for (const k of Object.keys(before.index)) if (!(k in after.index)) del.push(k.split('\u0000'));
  return { leads, set, del, empty: !leads.length && !set.length && !del.length };
}

/**
 * Optimistic transaction. `leads` says which lead records to load: an array
 * of ids, or 'all'. `fn` may run more than once, so it must only change state.
 */
async function tx(fn, { write = true, leads = [] } = {}) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const data = await call('load', { leadIds: leads });
    const state = toState(data);
    const before = snapshot(state);
    const result = await fn(state);
    if (!write) return result;
    const changes = diff(before, state);
    if (changes.empty) return result;
    const res = await call('commit', {
      version: data.version,
      leads: changes.leads,
      set: changes.set,
      del: changes.del,
    });
    if (res.ok) return result;
    await sleep(150 * (attempt + 1) + Math.random() * 200);
  }
  throw new Error('Google Sheets store is busy');
}

export const googleSheetsStore = {
  name: 'google-sheets',

  async createLead(lead, clientRequestId) {
    const existingId = await tx(
      (s) => {
        const existing = clientRequestId && s.requests[clientRequestId];
        if (existing) return existing;
        s.leads[lead.id] = lead;
        if (clientRequestId) s.requests[clientRequestId] = lead.id;
        return null;
      },
      { leads: [] },
    );
    if (existingId) {
      const existing = await this.getLead(existingId);
      if (existing) return { lead: existing, created: false };
    }
    return { lead: clone(lead), created: !existingId };
  },

  getLead(id) {
    return tx((s) => clone(s.leads[id]) ?? null, { write: false, leads: [id] });
  },

  findLeadId({ orderId, paymentId, clientRequestId }) {
    return tx(
      (s) =>
        (orderId && s.orders[orderId]) ||
        (paymentId && s.payments[paymentId]) ||
        (clientRequestId && s.requests[clientRequestId]) ||
        null,
      { write: false },
    );
  },

  listLeads() {
    return tx((s) => Object.values(s.leads).map(clone), { write: false, leads: 'all' });
  },

  updateLead(id, fn) {
    return tx(
      async (s) => {
        const lead = s.leads[id];
        if (!lead) return { lead: null, result: null };
        const result = await fn(lead, ledger(s));
        lead.updatedAt = new Date().toISOString();
        return { lead: clone(lead), result: clone(result) };
      },
      { leads: [id] },
    );
  },

  takenSlots(now = Date.now(), leadId = null) {
    return tx(
      (s) => {
        pruneHolds(s, now);
        const taken = new Set(Object.keys(s.bookings));
        for (const [slotId, hold] of Object.entries(s.holds)) if (hold.leadId !== leadId) taken.add(slotId);
        return [...taken];
      },
      { write: false },
    );
  },

  markEvent(eventId) {
    return tx((s) => {
      if (s.events[eventId]) return false;
      s.events[eventId] = new Date().toISOString();
      return true;
    });
  },

  eventSeen(eventId) {
    return tx((s) => Boolean(s.events[eventId]), { write: false });
  },

  async appendFallback(record) {
    await call('fallback', { fid: `fb_${Date.now()}_${randomBytes(4).toString('hex')}`, record });
  },

  async drainFallback() {
    const { records = [] } = await call('readFallback');
    if (!records.length) return 0;
    const done = [];
    let moved = 0;
    for (const { fid, record } of records) {
      const { lead, clientRequestId } = record ?? {};
      if (lead?.id) {
        lead.history = [...(lead.history ?? []), { at: new Date().toISOString(), event: 'recovered_from_fallback' }];
        const { created } = await this.createLead(lead, clientRequestId);
        if (created) moved += 1;
      }
      done.push(fid);
    }
    await call('clearFallback', { fids: done });
    return moved;
  },
};
