/**
 * State shared by the document-style stores (local JSON, Google Sheets, Redis):
 * leads plus one index, from the browser's request id to the lead it created,
 * so a double submit saves one lead.
 */

export const INDEX_TYPES = ['requests'];

export const empty = () => ({
  version: 1,
  leads: {},
  requests: {},
});

export const clone = (v) => (v === undefined ? undefined : structuredClone(v));
