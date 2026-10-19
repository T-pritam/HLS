import { createLead, publicStatus, saveLeadFallback } from '@/lib/book/booking';
import { tokenFor } from '@/lib/book/tokens';
import { fieldErrors, leadSchema } from '@/lib/book/schema';
import { injectedFault, json, rateLimited, readJson } from '@/lib/book/http';
import { log } from '@/lib/book/log';

export const runtime = 'nodejs';

/** Saves the lead before any payment, so drop-offs can be followed up. */
export async function POST(request) {
  if (rateLimited(request, 'lead', { limit: 8, windowMs: 10 * 60 * 1000 })) {
    return json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, 429);
  }
  const { body, error } = await readJson(request);
  if (error) return error;

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Please check the highlighted fields.', fields: fieldErrors(parsed.error) }, 422);
  const input = parsed.data;

  // Honeypot filled: answer like a success, store nothing.
  if (input.website) {
    log.warn('lead.honeypot', {});
    return json({ leadId: 'lead_ignored', token: 'x'.repeat(32), status: null });
  }

  try {
    if (injectedFault(request, 'storage')) throw new Error('Injected storage failure');
    const { lead } = await createLead(input);
    return json({ leadId: lead.id, token: tokenFor(lead.id), status: publicStatus(lead) });
  } catch (err) {
    log.error('lead.store_failed', { error: err.message });
    const kept = await saveLeadFallback(input);
    return json({ error: 'We could not save your details just now.', fallback: true, kept }, 503);
  }
}
