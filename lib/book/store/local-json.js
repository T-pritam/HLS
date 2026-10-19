import 'server-only';
import { mkdir, readFile, rename, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

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

const empty = () => ({
  version: 1,
  leads: {},
  requests: {},
  orders: {},
  payments: {},
  holds: {},
  bookings: {},
  events: {},
});

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

const clone = (v) => (v === undefined ? undefined : structuredClone(v));

function pruneHolds(state, now) {
  for (const [slotId, hold] of Object.entries(state.holds)) {
    if (Date.parse(hold.expiresAt) <= now) delete state.holds[slotId];
  }
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

/**
 * Slot and payment ledger, usable only inside updateLead so that changes to a
 * lead and to the ledger happen in one locked write.
 */
function ledger(s) {
  return {
    indexOrder(orderId, leadId) {
      s.orders[orderId] = leadId;
    },
    indexPayment(paymentId, leadId) {
      s.payments[paymentId] = leadId;
    },
    /**
     * Holds `slotId` for `leadId` until `expiresAt`, releasing the lead's other
     * hold. `sameDay` lists the other slot ids on that day, for the capacity cap.
     */
    hold(slotId, leadId, expiresAt, { sameDay = [], capacity = null } = {}) {
      const now = Date.now();
      pruneHolds(s, now);
      if (s.bookings[slotId] && s.bookings[slotId] !== leadId) return 'taken';
      const current = s.holds[slotId];
      if (current && current.leadId !== leadId) return 'taken';
      if (capacity) {
        const used = sameDay.filter(
          (id) => id !== slotId && (s.bookings[id] || (s.holds[id] && s.holds[id].leadId !== leadId)),
        ).length;
        if (used >= capacity) return 'full';
      }
      for (const [id, h] of Object.entries(s.holds)) if (h.leadId === leadId && id !== slotId) delete s.holds[id];
      s.holds[slotId] = { leadId, expiresAt };
      return 'held';
    },
    holdOf(leadId) {
      pruneHolds(s, Date.now());
      const entry = Object.entries(s.holds).find(([, h]) => h.leadId === leadId);
      return entry ? { slotId: entry[0], expiresAt: entry[1].expiresAt } : null;
    },
    release(leadId) {
      let released = false;
      for (const [id, h] of Object.entries(s.holds)) {
        if (h.leadId === leadId) {
          delete s.holds[id];
          released = true;
        }
      }
      return released;
    },
    /** Books the slot for the lead: 'claimed', 'already' (theirs) or 'taken'. */
    claim(slotId, leadId, { sameDay = [], capacity = null } = {}) {
      pruneHolds(s, Date.now());
      if (s.bookings[slotId] === leadId) return 'already';
      if (s.bookings[slotId]) return 'taken';
      const hold = s.holds[slotId];
      if (hold && hold.leadId !== leadId) return 'taken';
      if (capacity) {
        const used = sameDay.filter((id) => id !== slotId && s.bookings[id]).length;
        if (used >= capacity) return 'taken';
      }
      s.bookings[slotId] = leadId;
      delete s.holds[slotId];
      return 'claimed';
    },
    unbook(slotId, leadId) {
      if (s.bookings[slotId] === leadId) delete s.bookings[slotId];
    },
    seenEvent(eventId) {
      return Boolean(eventId && s.events[eventId]);
    },
    markEvent(eventId) {
      if (eventId) s.events[eventId] = new Date().toISOString();
    },
  };
}
