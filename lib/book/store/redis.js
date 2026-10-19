import 'server-only';
import { getServerConfig } from '../config';
import { callSheets, sheetsConfigured } from '../sheets-client';
import { mirrorLeads } from '../sheets-mirror';
import { INDEX_TYPES, clone, empty, ledger, pruneHolds } from './ledger';

/**
 * Lead store on Redis through Upstash's REST API (Vercel Marketplace →
 * Upstash for Redis). Each call takes a few milliseconds, so it is the store
 * for production traffic on Vercel. Google Sheets, when configured, receives a
 * copy of every changed lead in the background (lib/book/sheets-mirror.js).
 *
 * Layout (prefix hls:book:): lead:<id> JSON, leads (set of ids),
 * idx:<type> hashes (requests, orders, payments, holds, bookings, events),
 * version, fallback (list).
 *
 * Writes are optimistic: read, change in memory, then commit through one Lua
 * script that applies everything only if the version has not moved. That keeps
 * slot holds and claims safe across serverless instances.
 */

const P = 'hls:book:';
const KEY = {
  version: `${P}version`,
  leads: `${P}leads`,
  fallback: `${P}fallback`,
  lead: (id) => `${P}lead:${id}`,
  idx: (type) => `${P}idx:${type}`,
};
const RETRIES = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const COMMIT = `
local v = tonumber(redis.call('GET', KEYS[1]) or '0')
if v ~= tonumber(ARGV[1]) then return {0, v} end
local nl, ns, nd = tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local a = 5
for i = 1, nl do
  redis.call('SET', KEYS[tonumber(ARGV[a])], ARGV[a + 1])
  redis.call('SADD', KEYS[2], ARGV[a + 2])
  a = a + 3
end
for i = 1, ns do
  redis.call('HSET', KEYS[tonumber(ARGV[a])], ARGV[a + 1], ARGV[a + 2])
  a = a + 3
end
for i = 1, nd do
  redis.call('HDEL', KEYS[tonumber(ARGV[a])], ARGV[a + 1])
  a = a + 2
end
redis.call('SET', KEYS[1], v + 1)
return {1, v + 1}
`;

async function rest(path, body) {
  const { redisUrl, redisToken } = getServerConfig();
  if (!redisUrl || !redisToken) throw new Error('Redis is not configured');
  const res = await fetch(`${redisUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Redis: unexpected response (HTTP ${res.status})`);
  }
  if (!res.ok || data?.error) throw new Error(`Redis: ${data?.error ?? res.status}`);
  return data;
}

const run = async (cmd) => (await rest('', cmd)).result;

async function multi(cmds) {
  const out = await rest('/multi-exec', cmds);
  return out.map((r) => {
    if (r.error) throw new Error(`Redis: ${r.error}`);
    return r.result;
  });
}

const parse = (v) => {
  if (v === null || v === undefined) return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/**
 * Reads what a transaction needs, consistently (one MULTI). `spec.leads` is a
 * list of ids; `spec.full` lists index types to read whole (small ones);
 * `spec.keys` maps index types to the keys to read.
 */
async function load(spec) {
  const cmds = [['GET', KEY.version]];
  const plan = [];
  for (const type of spec.full ?? []) {
    cmds.push(['HGETALL', KEY.idx(type)]);
    plan.push({ kind: 'full', type });
  }
  for (const [type, keys] of Object.entries(spec.keys ?? {})) {
    const list = keys.filter(Boolean);
    if (!list.length) continue;
    cmds.push(['HMGET', KEY.idx(type), ...list]);
    plan.push({ kind: 'keys', type, keys: list });
  }
  const ids = (spec.leads ?? []).filter(Boolean);
  if (ids.length) {
    cmds.push(['MGET', ...ids.map(KEY.lead)]);
    plan.push({ kind: 'leads', ids });
  }
  const results = await multi(cmds);
  const state = empty();
  const version = Number(results[0] ?? 0);
  plan.forEach((p, i) => {
    const r = results[i + 1];
    if (p.kind === 'full') {
      for (let j = 0; j < (r ?? []).length; j += 2) state[p.type][r[j]] = parse(r[j + 1]);
    } else if (p.kind === 'keys') {
      p.keys.forEach((k, j) => {
        if (r?.[j] !== null && r?.[j] !== undefined) state[p.type][k] = parse(r[j]);
      });
    } else {
      p.ids.forEach((id, j) => {
        if (r?.[j]) state.leads[id] = JSON.parse(r[j]);
      });
    }
  });
  return { state, version };
}

function snapshot(state) {
  const leads = {};
  for (const [id, lead] of Object.entries(state.leads)) leads[id] = JSON.stringify(lead);
  const index = {};
  for (const type of INDEX_TYPES) {
    for (const [k, v] of Object.entries(state[type])) index[`${type}\u0000${k}`] = JSON.stringify(v);
  }
  return { leads, index };
}

function diff(before, state) {
  const after = snapshot(state);
  const leads = Object.keys(after.leads).filter((id) => after.leads[id] !== before.leads[id]);
  const set = [];
  const del = [];
  for (const [k, v] of Object.entries(after.index)) if (before.index[k] !== v) set.push([...k.split('\u0000'), v]);
  for (const k of Object.keys(before.index)) if (!(k in after.index)) del.push(k.split('\u0000'));
  return { leads, set, del, after, empty: !leads.length && !set.length && !del.length };
}

async function commit(version, changes, state) {
  const keys = [KEY.version, KEY.leads];
  const pos = (key) => {
    let i = keys.indexOf(key);
    if (i < 0) i = keys.push(key) - 1;
    return String(i + 1);
  };
  const args = [String(version), String(changes.leads.length), String(changes.set.length), String(changes.del.length)];
  for (const id of changes.leads) args.push(pos(KEY.lead(id)), changes.after.leads[id], id);
  for (const [type, k, v] of changes.set) args.push(pos(KEY.idx(type)), k, v);
  for (const [type, k] of changes.del) args.push(pos(KEY.idx(type)), k);
  const [ok] = await run(['EVAL', COMMIT, String(keys.length), ...keys, ...args]);
  if (Number(ok) === 1) mirrorLeads(changes.leads.map((id) => state.leads[id]));
  return Number(ok) === 1;
}

/** Optimistic transaction; `fn` may run more than once, so it only changes state. */
async function tx(fn, spec, { write = true } = {}) {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const { state, version } = await load(spec);
    const before = snapshot(state);
    const result = await fn(state);
    if (!write) return result;
    const changes = diff(before, state);
    if (changes.empty) return result;
    if (await commit(version, changes, state)) return result;
    await sleep(20 * (attempt + 1) + Math.random() * 40);
  }
  throw new Error('Redis store is busy');
}

const SLOTS = { full: ['holds', 'bookings'] };

export const redisStore = {
  name: 'redis',

  async createLead(lead, clientRequestId) {
    const existingId = await tx(
      (s) => {
        const existing = clientRequestId && s.requests[clientRequestId];
        if (existing) return existing;
        s.leads[lead.id] = lead;
        if (clientRequestId) s.requests[clientRequestId] = lead.id;
        return null;
      },
      { keys: { requests: [clientRequestId] } },
    );
    if (existingId) {
      const existing = await this.getLead(existingId);
      if (existing) return { lead: existing, created: false };
    }
    return { lead: clone(lead), created: !existingId };
  },

  async getLead(id) {
    const raw = await run(['GET', KEY.lead(id)]);
    return raw ? JSON.parse(raw) : null;
  },

  async findLeadId({ orderId, paymentId, clientRequestId }) {
    const [o, p, r] = await multi([
      ['HGET', KEY.idx('orders'), orderId ?? ''],
      ['HGET', KEY.idx('payments'), paymentId ?? ''],
      ['HGET', KEY.idx('requests'), clientRequestId ?? ''],
    ]);
    return (orderId && parse(o)) || (paymentId && parse(p)) || (clientRequestId && parse(r)) || null;
  },

  async listLeads() {
    const ids = (await run(['SMEMBERS', KEY.leads])) ?? [];
    if (!ids.length) return [];
    const raws = await run(['MGET', ...ids.map(KEY.lead)]);
    return raws.filter(Boolean).map((r) => JSON.parse(r));
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
      { leads: [id], ...SLOTS },
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
      SLOTS,
      { write: false },
    );
  },

  /** Webhook de-duplication: HSETNX is atomic on its own. */
  async markEvent(eventId) {
    return Number(await run(['HSETNX', KEY.idx('events'), eventId, JSON.stringify(new Date().toISOString())])) === 1;
  },

  async eventSeen(eventId) {
    return Number(await run(['HEXISTS', KEY.idx('events'), eventId])) === 1;
  },

  /** Parks a lead whose save failed: in Redis, or in the sheet if Redis is down. */
  async appendFallback(record) {
    const entry = JSON.stringify({ at: new Date().toISOString(), ...record });
    try {
      await run(['RPUSH', KEY.fallback, entry]);
    } catch (err) {
      if (!sheetsConfigured()) throw err;
      await callSheets('fallback', { fid: `fb_${Date.now()}`, record });
    }
  },

  async drainFallback() {
    const items = (await run(['LRANGE', KEY.fallback, '0', '-1'])) ?? [];
    if (!items.length) return 0;
    let moved = 0;
    for (const item of items) {
      const { lead, clientRequestId } = JSON.parse(item);
      if (!lead?.id) continue;
      lead.history = [...(lead.history ?? []), { at: new Date().toISOString(), event: 'recovered_from_fallback' }];
      const { created } = await this.createLead(lead, clientRequestId);
      if (created) moved += 1;
    }
    await run(['LTRIM', KEY.fallback, String(items.length), '-1']);
    return moved;
  },
};
