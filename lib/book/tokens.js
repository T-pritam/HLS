import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getServerConfig } from './config';
import { log } from './log';

let processSecret = null;

/**
 * Secret for per-lead links. BOOK_TOKEN_SECRET when set, otherwise derived
 * from the Razorpay key secret, otherwise a per-process random value (links
 * then stop working after a restart, which is acceptable in development only).
 */
function secret() {
  const cfg = getServerConfig();
  if (cfg.tokenSecret) return cfg.tokenSecret;
  if (cfg.razorpay.keySecret) {
    return createHmac('sha256', cfg.razorpay.keySecret).update('hls-book-lead-token').digest('hex');
  }
  if (!processSecret) {
    processSecret = randomBytes(32).toString('hex');
    log.warn('token.secret_missing', { note: 'Set BOOK_TOKEN_SECRET; using a per-process secret.' });
  }
  return processSecret;
}

export function tokenFor(leadId, purpose = 'lead') {
  return createHmac('sha256', secret()).update(`${purpose}:${leadId}`).digest('base64url').slice(0, 32);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkToken(leadId, token, purpose = 'lead') {
  return safeEqual(tokenFor(leadId, purpose), token);
}
