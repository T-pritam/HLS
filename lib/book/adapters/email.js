import 'server-only';
import { getServerConfig } from '../config';
import { log, maskEmail } from '../log';

/**
 * Email adapter. Only the console stub exists until a provider and sender
 * address are chosen: it logs that a message would be sent, with the
 * recipient masked and no body. Returns { sent, provider }.
 */
const providers = {
  console: async ({ to, subject, template }) => {
    log.info('email.stub', { to: maskEmail(to), subject, template });
    return { sent: false, provider: 'console' };
  },
};

export async function sendEmail(message) {
  const cfg = getServerConfig();
  const send = providers[cfg.emailProvider] ?? providers.console;
  try {
    return await send({ from: cfg.emailSender, ...message });
  } catch (err) {
    log.error('email.failed', { template: message.template, error: err.message });
    return { sent: false, provider: cfg.emailProvider, error: true };
  }
}
