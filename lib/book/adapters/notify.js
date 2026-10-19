import 'server-only';
import { getServerConfig } from '../config';
import { log } from '../log';
import { sendEmail } from './email';

/** Alerts the owner about a lead that needs a person (for example, paid with no slot). */
export async function alertOwner(kind, lead, detail) {
  // Minimum detail only: no contact details, no documents.
  log.warn('owner.alert', { kind, leadId: lead?.id, status: lead?.status, detail });
  const to = getServerConfig().ownerAlertEmail;
  if (to) {
    await sendEmail({
      to,
      subject: `HLS booking needs attention: ${kind}`,
      template: 'owner-alert',
      data: { kind, leadId: lead?.id, detail },
    });
  }
}
