import 'server-only';
import { getServerConfig } from '../config';
import { tokenFor } from '../tokens';

/**
 * Private intake for marksheets and mock papers. Stub: it issues a signed,
 * per-lead link to a page that accepts nothing yet. Documents never pass
 * through the public form, analytics, Sheets or Telegram.
 */
export function intakeLink(leadId) {
  const base = getServerConfig().siteUrl ?? '';
  const t = tokenFor(leadId, 'intake');
  return `${base}/book/intake?lead=${encodeURIComponent(leadId)}&t=${t}`;
}

export function intakeProvider() {
  return getServerConfig().intakeStore;
}
