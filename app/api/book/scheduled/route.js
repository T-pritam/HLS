import { CALENDLY_EVENT_URI, CALENDLY_INVITEE_URI, markScheduled } from '@/lib/book/booking';
import { checkToken } from '@/lib/book/tokens';
import { scheduledSchema } from '@/lib/book/schema';
import { json, rateLimited, readJson } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';

/**
 * Called by /sip when the Calendly calendar reports a booking. Needs the lead's
 * private token, so only the browser that saved the details can mark it booked.
 */
export async function POST(request) {
  if (rateLimited(request, 'scheduled', { limit: 20, windowMs: 10 * 60 * 1000 })) {
    return json({ error: 'Too many requests.' }, 429);
  }
  const { body, error } = await readJson(request);
  if (error) return error;
  const parsed = scheduledSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid request.' }, 422);
  const { leadId, token, eventUri, inviteeUri } = parsed.data;
  if (!checkToken(leadId, token)) return json({ error: 'Not found.' }, 404);
  if (!CALENDLY_EVENT_URI.test(eventUri) || !CALENDLY_INVITEE_URI.test(inviteeUri) || !inviteeUri.startsWith(`${eventUri}/`)) {
    return json({ error: 'Invalid request.' }, 422);
  }
  try {
    const res = await markScheduled(leadId, { eventUri, inviteeUri });
    if (res.error) return json({ error: 'Not found.' }, 404);
    return json({ status: res.status });
  } catch (err) {
    log.error('lead.schedule_store_failed', { leadId, error: err.message });
    return json({ error: 'We could not save your booking just now. Calendly has it, so it still stands.' }, 503);
  }
}
