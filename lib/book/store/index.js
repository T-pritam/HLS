import 'server-only';
import { getServerConfig } from '../config';
import { localJsonStore } from './local-json';
import { googleSheetsStore } from './google-sheets';
import { redisStore } from './redis';

/**
 * Lead store adapter. A CRM or database adapter must provide the same methods
 * with the same atomicity (a slot can be held or claimed by one lead only):
 *
 *   createLead(lead, clientRequestId) -> { lead, created }
 *   getLead(id) -> lead | null
 *   findLeadId({ orderId | paymentId | clientRequestId }) -> id | null
 *   listLeads() -> lead[]
 *   updateLead(id, fn(lead, ledger)) -> { lead, result }
 *     ledger: indexOrder, indexPayment, hold, holdOf, release, claim, unbook
 *   takenSlots(now, leadId) -> slotId[]
 *   markEvent(eventId) -> boolean (false if already seen)
 *   eventSeen(eventId) -> boolean
 *   appendFallback(record), drainFallback() -> number
 *
 * The lead record shape is documented in lib/book/booking.js (newLead).
 */
const adapters = { 'local-json': localJsonStore, redis: redisStore, 'google-sheets': googleSheetsStore };

export function getStore() {
  return adapters[getServerConfig().leadStore] ?? localJsonStore;
}
