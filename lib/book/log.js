import 'server-only';

/** Masks contact details so logs never carry them in full. */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email ? '***' : null;
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}***@${domain.slice(0, 1)}***`;
}

export function maskPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return `***${digits.slice(-3)}`;
}

const REDACT = new Set(['name', 'mobile', 'email', 'phone', 'token', 'secret', 'signature', 'keySecret']);

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'email') out[k] = maskEmail(v);
    else if (k === 'mobile' || k === 'phone') out[k] = maskPhone(v);
    else if (REDACT.has(k)) out[k] = v ? '[redacted]' : v;
    else out[k] = redact(v, depth + 1);
  }
  return out;
}

function write(level, event, data) {
  const line = JSON.stringify({ at: new Date().toISOString(), level, event, ...redact(data ?? {}) });
  if (level === 'error') console.error(`[book] ${line}`);
  else if (level === 'warn') console.warn(`[book] ${line}`);
  else console.log(`[book] ${line}`);
}

export const log = {
  info: (event, data) => write('info', event, data),
  warn: (event, data) => write('warn', event, data),
  error: (event, data) => write('error', event, data),
};
