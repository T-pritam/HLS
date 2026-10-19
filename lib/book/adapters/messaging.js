import 'server-only';
import { log, maskPhone } from '../log';

/**
 * WhatsApp and SMS adapters. Stubs: no provider is selected, and SMS needs
 * DLT registration in India, which is not established. Nothing is sent.
 */
export async function sendWhatsApp({ to, template }) {
  log.info('whatsapp.stub', { to: maskPhone(to), template });
  return { sent: false, provider: 'stub' };
}

export async function sendSms({ to, template }) {
  log.info('sms.stub', { to: maskPhone(to), template });
  return { sent: false, provider: 'stub' };
}
