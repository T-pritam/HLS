/**
 * State shared by the document-style stores (local JSON, Google Sheets): leads
 * plus small indexes, and the slot and payment ledger that changes them.
 */

export const INDEX_TYPES = ['requests', 'orders', 'payments', 'holds', 'bookings', 'events'];

export const empty = () => ({
  version: 1,
  leads: {},
  requests: {},
  orders: {},
  payments: {},
  holds: {},
  bookings: {},
  events: {},
});

export const clone = (v) => (v === undefined ? undefined : structuredClone(v));

export function pruneHolds(state, now) {
  for (const [slotId, hold] of Object.entries(state.holds)) {
    if (Date.parse(hold.expiresAt) <= now) delete state.holds[slotId];
  }
}

/**
 * Slot and payment ledger, usable only inside updateLead so that changes to a
 * lead and to the ledger happen in one locked write.
 */
export function ledger(s) {
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
