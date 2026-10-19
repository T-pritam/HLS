import { z } from 'zod';
import { STATUSES, adminUpdate, getLead, listLeads } from '@/lib/book/booking';
import { isAdmin, json } from '@/lib/book/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin: list leads, or one with ?id=. Needs BOOK_ADMIN_TOKEN as a Bearer token. */
export async function GET(request) {
  if (!isAdmin(request)) return json({ error: 'Not found.' }, 404);
  const id = new URL(request.url).searchParams.get('id');
  if (id) return json({ lead: await getLead(id) });
  return json({ leads: await listLeads() });
}

const patch = z.object({
  leadId: z.string().min(6).max(40),
  status: z.enum(STATUSES).optional(),
  owner: z.string().max(80).nullable().optional(),
  nextAction: z.string().max(200).nullable().optional(),
  needsAttention: z.string().max(60).nullable().optional(),
  note: z.string().max(1000).optional(),
});

/** Admin: move a lead through Attended, Blueprint delivered, In counselling, and so on. */
export async function PATCH(request) {
  if (!isAdmin(request)) return json({ error: 'Not found.' }, 404);
  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid update.' }, 422);
  const { leadId, ...changes } = parsed.data;
  const lead = await adminUpdate(leadId, changes);
  if (!lead) return json({ error: 'Not found.' }, 404);
  return json({ lead });
}
