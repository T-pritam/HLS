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
  // TODO(PM): ₹3,000 inclusive of all taxes is approved. Change only by env.
  const priceInr = positiveInt('CONSULTATION_FEE_INR', 3000);
  const payment = getPaymentMode();

  return {
    priceInr,
    // TODO(PM): label approved as "inclusive of all taxes".
    taxLabel: env('NEXT_PUBLIC_CONSULTATION_TAX_LABEL') ?? 'inclusive of all taxes',
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
    // TODO(PM): refund processing time, for example "5 to 7 working days".
    refundProcessingTime: env('NEXT_PUBLIC_REFUND_PROCESSING_TIME'),
    // TODO(HLS): policy drafts stay hidden until HLS confirms the text.
    policyPublished: flag('NEXT_PUBLIC_POLICY_PUBLISHED', false),
    siteUrl: env('NEXT_PUBLIC_SITE_URL'),
    paymentMode: payment.mode,
    paymentsReady: payment.ready,
    razorpayKeyId: payment.ready && payment.mode === 'test' ? payment.publicKeyId : null,
    slotsSynthetic: getSlotConfig().source === 'synthetic',
    holdMinutes: getSlotConfig().holdMinutes,
    showTodoMarkers: process.env.NODE_ENV === 'development',
  };
}

/**
 * Razorpay mode. v1 is test only: live keys are refused, and "mock" runs a
 * local simulated checkout that never calls Razorpay.
 */
export function getPaymentMode() {
  const mode = oneOf('RAZORPAY_MODE', ['test', 'mock'], 'test');
  const keyId = env('RAZORPAY_KEY_ID');
  const keySecret = env('RAZORPAY_KEY_SECRET');
  const webhookSecret = env('RAZORPAY_WEBHOOK_SECRET');
  const publicKeyId = env('NEXT_PUBLIC_RAZORPAY_KEY_ID') ?? keyId;

  if (env('RAZORPAY_MODE') === 'live') {
    return { mode: 'test', ready: false, reason: 'Live mode is not enabled in v1.' };
  }
  if (mode === 'mock') {
    // Mock checkout confirms bookings without money, so it also needs the
    // dev-only test switch. Never enable both on a deployed site.
    if (!flag('BOOK_TEST_HOOKS', false)) {
      return { mode, ready: false, reason: 'Mock mode needs BOOK_TEST_HOOKS=true (development only).' };
    }
    return { mode, ready: true, publicKeyId: null };
  }
  if (!keyId || !keySecret) {
    return { mode, ready: false, reason: 'Razorpay test keys are not set.' };
  }
  if (!keyId.startsWith('rzp_test_') || (publicKeyId && !publicKeyId.startsWith('rzp_test_'))) {
    return { mode, ready: false, reason: 'Only rzp_test_ keys are accepted in v1.' };
  }
  if (!webhookSecret) {
    // Payments still work; paid state then comes from server-side reconciliation.
    return { mode, ready: true, publicKeyId, webhookMissing: true };
  }
  return { mode, ready: true, publicKeyId };
}

export function getSlotConfig() {
  return {
    // TODO(Himakanth): real days, times and capacity. Synthetic until then.
    source: oneOf('SLOTS_SOURCE', ['synthetic', 'config'], 'synthetic'),
    configured: (env('SLOTS_CONFIG') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    capacityPerDay: positiveInt('CAPACITY_PER_DAY', null),
    holdMinutes: positiveInt('SLOT_HOLD_MINUTES', 10),
  };
}

/** Server-only values. Never pass this object to a client component. */
export function getServerConfig() {
  const payment = getPaymentMode();
  return {
    priceInr: positiveInt('CONSULTATION_FEE_INR', 3000),
    currency: 'INR',
    // TODO(Irfan): GST invoice or receipt, and the issuing entity.
    invoiceType: env('INVOICE_TYPE') ?? 'standard',
    payment,
    razorpay: {
      keyId: env('RAZORPAY_KEY_ID'),
      keySecret: env('RAZORPAY_KEY_SECRET'),
      webhookSecret: env('RAZORPAY_WEBHOOK_SECRET'),
    },
    // TODO(PM): lead storage (existing CRM preferred). local-json in dev;
    // redis (Upstash) on Vercel, with Google Sheets as a background copy when
    // BOOK_SHEETS_URL is set; google-sheets alone works but is slow.
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
    // Per-route payment switch. Both routes are paid by default.
    paymentRequired: {
      nov: flag('PAYMENT_REQUIRED_NOV', true),
      may: flag('PAYMENT_REQUIRED_MAY', true),
    },
    tokenSecret: env('BOOK_TOKEN_SECRET'),
    adminToken: env('BOOK_ADMIN_TOKEN'),
    testHooks: flag('BOOK_TEST_HOOKS', false),
    siteUrl: env('NEXT_PUBLIC_SITE_URL'),
  };
}
