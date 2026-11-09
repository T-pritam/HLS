import 'server-only';
import { randomBytes } from 'node:crypto';
import { callSheets as call } from '../sheets-client';
import { INDEX_TYPES, clone, empty } from './ledger';

/**
 * Lead store on a Google Sheet, through the Apps Script web app in
 * scripts/google-sheets/Code.gs (setup: docs/google-sheets-setup.md).
 *
 * Works on serverless hosts such as Vercel. Every change is a read, then a
 * commit that the script accepts only if nothing else was written in between
 * (a version number checked under the script's lock); on a clash it retries.
 * That keeps changes safe across server instances. Meant for low
 * volume: each call takes about a second.
 */

const RETRIES = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  listLeads() {
    return tx((s) => Object.values(s.leads).map(clone), { write: false, leads: 'all' });
  },

  updateLead(id, fn) {
    return tx(
      async (s) => {
        const lead = s.leads[id];
        if (!lead) return { lead: null, result: null };
        const result = await fn(lead);
        lead.updatedAt = new Date().toISOString();
        return { lead: clone(lead), result: clone(result) };
      },
      { leads: [id] },
    );
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
