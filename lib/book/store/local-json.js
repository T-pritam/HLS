import 'server-only';
import { mkdir, readFile, rename, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { clone, empty, ledger, pruneHolds } from './ledger';

/**
 * Development lead store: one JSON document in .data/ (gitignored), written
 * atomically, with every change serialised through an in-process lock so slot
 * holds and claims cannot interleave. It is safe for a single server process
 * only. On a serverless or multi-instance host, replace it with an adapter
 * backed by the chosen CRM or database that keeps the same methods.
 */

const DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DIR, 'book-store.json');
const FALLBACK = path.join(DIR, 'lead-fallback.ndjson');

let chain = Promise.resolve();

function locked(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function load() {
  try {
    return { ...empty(), ...JSON.parse(await readFile(FILE, 'utf8')) };
  } catch (err) {
    if (err.code === 'ENOENT') return empty();
    throw err;
  }
}

async function save(state) {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, FILE);
}

/** Read-modify-write under the lock. `fn` may mutate state and returns a result. */
function tx(fn, { write = true } = {}) {
  return locked(async () => {
    const state = await load();
    const result = await fn(state);
    if (write) await save(state);
    return result;
  });
}

export const localJsonStore = {
  name: 'local-json',

  createLead(lead, clientRequestId) {
    return tx((s) => {
      const existing = clientRequestId && s.requests[clientRequestId];
      if (existing && s.leads[existing]) return { lead: clone(s.leads[existing]), created: false };
      s.leads[lead.id] = lead;
      if (clientRequestId) s.requests[clientRequestId] = lead.id;
      return { lead: clone(lead), created: true };
    });
  },

  getLead(id) {
    return tx((s) => clone(s.leads[id]) ?? null, { write: false });
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
    return tx((s) => Object.values(s.leads).map(clone), { write: false });
  },

  /**
   * Applies `fn(lead, state)` to a stored lead under the lock. `fn` mutates
   * the lead in place and may return a value, which is passed back.
   */
  updateLead(id, fn) {
    return tx(async (s) => {
      const lead = s.leads[id];
      if (!lead) return { lead: null, result: null };
      const result = await fn(lead, ledger(s));
      lead.updatedAt = new Date().toISOString();
      return { lead: clone(lead), result: clone(result) };
    });
  },

  /** Slots that are booked, or held by someone other than `leadId`. */
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

  /** Webhook de-duplication. True if the event id was new and is now recorded. */
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
    await mkdir(DIR, { recursive: true });
    await appendFile(FALLBACK, `${JSON.stringify({ at: new Date().toISOString(), ...record })}\n`);
  },

  /** Moves leads saved to the fallback file into the store. Returns how many. */
  drainFallback() {
    return locked(async () => {
      let text;
      try {
        text = await readFile(FALLBACK, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') return 0;
        throw err;
      }
      const lines = text.split('\n').filter(Boolean);
      if (!lines.length) return 0;
      const state = await load();
      let moved = 0;
      for (const line of lines) {
        const { lead, clientRequestId } = JSON.parse(line);
        if (!lead?.id || state.leads[lead.id]) continue;
        if (clientRequestId && state.requests[clientRequestId]) continue;
        lead.history = [...(lead.history ?? []), { at: new Date().toISOString(), event: 'recovered_from_fallback' }];
        state.leads[lead.id] = lead;
        if (clientRequestId) state.requests[clientRequestId] = lead.id;
        moved += 1;
      }
      await save(state);
      await writeFile(FALLBACK, '');
      return moved;
    });
  },
};
