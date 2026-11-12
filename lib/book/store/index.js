import 'server-only';
import { getServerConfig } from '../config';
import { localJsonStore } from './local-json';
import { googleSheetsStore } from './google-sheets';
import { redisStore } from './redis';

/**
 * Lead store adapter. A CRM or database adapter must provide the same methods,
 * with updateLead applied as one atomic read-change-write:
 *
 *   createLead(lead, clientRequestId) -> { lead, created }
 *   getLead(id) -> lead | null
 *   listLeads() -> lead[]
 *   updateLead(id, fn(lead)) -> { lead, result }
 *   appendFallback(record), drainFallback() -> number
 *
 * The lead record shape is documented in lib/book/booking.js (newLead).
 */
const adapters = { 'local-json': localJsonStore, redis: redisStore, 'google-sheets': googleSheetsStore };

export function getStore() {
  return adapters[getServerConfig().leadStore] ?? localJsonStore;
}
