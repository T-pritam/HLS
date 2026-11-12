import 'server-only';

/**
 * Every changeable business value for /book, read from the environment in one
 * place. Each value has a safe default. Unset display values are `null`, and
 * the UI hides them or says "to be confirmed"; it never shows a placeholder as
 * if it were a fact.
 *
 * NEXT_PUBLIC_* values are display values. They are passed to client
 * components as props through getPublicConfig(), never imported there.
 * Secrets are only reachable through getServerConfig().
 */

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function flag(name, fallback) {
  const value = env(name);
  if (value === null) return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function positiveInt(name, fallback) {
  const value = env(name);
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function oneOf(name, allowed, fallback) {
  const value = env(name);
  return value !== null && allowed.includes(value) ? value : fallback;
}

/** Display values. Safe to render. */
export function getPublicConfig() {
  return {
    // TODO(PM): legal entity name for the footer and legal pages.
    legalEntityName: env('NEXT_PUBLIC_LEGAL_ENTITY_NAME'),
    // TODO(PM): support contacts. Hidden in production while unset.
    supportPhone: env('NEXT_PUBLIC_SUPPORT_PHONE'),
    supportWhatsApp: env('NEXT_PUBLIC_SUPPORT_WHATSAPP'),
    supportEmail: env('NEXT_PUBLIC_SUPPORT_EMAIL'),
    // TODO(Himakanth): consultant name. Not assumed to be the mentor.
    consultantName: env('NEXT_PUBLIC_CONSULTANT_NAME'),
    // TODO(Himakanth): consultation length in minutes.
    durationMin: positiveInt('NEXT_PUBLIC_CONSULTATION_DURATION_MIN', null),
    // TODO(PM): how the consultation is held (for example "Online video call").
    consultationMode: env('NEXT_PUBLIC_CONSULTATION_MODE'),
    // TODO(Himakanth): blueprint format and turnaround.
    blueprintFormat: env('NEXT_PUBLIC_BLUEPRINT_FORMAT'),
    blueprintTurnaround: env('NEXT_PUBLIC_BLUEPRINT_TURNAROUND'),
    // Calendly booking page shown on /sip after the details step.
    calendlyUrl: calendlyUrl(),
    // The consultation's regular fee, shown struck through beside
    // "Complimentary" while the offer runs. ₹3,000 was the approved price;
    // "0" hides it.
    regularFeeInr: env('NEXT_PUBLIC_CONSULTATION_REGULAR_FEE_INR') === '0' ? null : positiveInt('NEXT_PUBLIC_CONSULTATION_REGULAR_FEE_INR', 3000),
    // TODO(HLS): policy drafts stay hidden until HLS confirms the text.
    policyPublished: flag('NEXT_PUBLIC_POLICY_PUBLISHED', false),
    siteUrl: env('NEXT_PUBLIC_SITE_URL'),
    showTodoMarkers: process.env.NODE_ENV === 'development',
  };
}

/** The Calendly link, only if it really is one (https://calendly.com/...). */
function calendlyUrl() {
  const value = env('NEXT_PUBLIC_CALENDLY_URL');
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'calendly.com' || u.hostname.endsWith('.calendly.com')) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Server-only values. Never pass this object to a client component. */
export function getServerConfig() {
  return {
    // Lead storage. local-json in dev (one process only); redis on the server,
    // with Google Sheets as a background copy when BOOK_SHEETS_URL is set;
    // google-sheets alone works but is slow.
    leadStore: oneOf('LEAD_STORE', ['local-json', 'redis', 'google-sheets'], 'local-json'),
    sheetsUrl: env('BOOK_SHEETS_URL'),
    sheetsSecret: env('BOOK_SHEETS_SECRET'),
    // Vercel Marketplace (Upstash) adds KV_REST_API_*; Upstash itself uses UPSTASH_REDIS_REST_*.
    redisUrl: env('UPSTASH_REDIS_REST_URL') ?? env('KV_REST_API_URL'),
    redisToken: env('UPSTASH_REDIS_REST_TOKEN') ?? env('KV_REST_API_TOKEN'),
    // TODO(PM): email provider and sender. Logged to the console until chosen.
    emailProvider: oneOf('EMAIL_PROVIDER', ['console'], 'console'),
    emailSender: env('EMAIL_SENDER_ADDRESS'),
    // TODO(PM): private intake tool and access list.
    intakeStore: oneOf('INTAKE_STORE', ['stub'], 'stub'),
    ownerAlertEmail: env('OWNER_ALERT_EMAIL'),
    // Optional Calendly personal access token: lets the server look up the booked time.
    calendlyApiToken: env('CALENDLY_API_TOKEN'),
    tokenSecret: env('BOOK_TOKEN_SECRET'),
    adminToken: env('BOOK_ADMIN_TOKEN'),
    testHooks: flag('BOOK_TEST_HOOKS', false),
    siteUrl: env('NEXT_PUBLIC_SITE_URL'),
  };
}
