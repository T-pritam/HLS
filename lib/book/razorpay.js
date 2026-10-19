import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import Razorpay from 'razorpay';
import { getServerConfig } from './config';
import { safeEqual } from './tokens';

/**
 * Razorpay gateway, test mode only. In "mock" mode nothing leaves the server:
 * orders and payments are simulated locally and signed with dev secrets, so the
 * whole flow (signatures and webhooks included) can be exercised without keys.
 */

const MOCK_KEY_SECRET = 'mock-key-secret-dev-only';
const MOCK_WEBHOOK_SECRET = 'mock-webhook-secret-dev-only';

let client = null;
let clientKey = null;

function cfg() {
  return getServerConfig();
}

export function isMock() {
  return cfg().payment.mode === 'mock';
}

function keySecret() {
  return isMock() ? (cfg().razorpay.keySecret ?? MOCK_KEY_SECRET) : cfg().razorpay.keySecret;
}

export function webhookSecret() {
  return isMock() ? (cfg().razorpay.webhookSecret ?? MOCK_WEBHOOK_SECRET) : cfg().razorpay.webhookSecret;
}

function api() {
  const { keyId, keySecret: secret } = cfg().razorpay;
  if (!cfg().payment.ready || isMock()) throw new Error('Razorpay is not configured');
  if (!client || clientKey !== keyId) {
    client = new Razorpay({ key_id: keyId, key_secret: secret });
    clientKey = keyId;
  }
  return client;
}

const hmac = (secret, data) => createHmac('sha256', secret).update(data).digest('hex');

/** Checkout signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = keySecret();
  if (!secret) return false;
  return safeEqual(hmac(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = webhookSecret();
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, rawBody), signature);
}

/** Signs as Razorpay would. Used by the mock checkout and the QA script only. */
export function mockSign(kind, data) {
  return hmac(kind === 'webhook' ? webhookSecret() : keySecret(), data);
}

export const mockId = (prefix) => `${prefix}_mock${randomBytes(7).toString('hex')}`;

export async function createOrder({ amountPaise, currency, receipt, notes }) {
  if (isMock()) {
    return { id: mockId('order'), amount: amountPaise, currency, receipt, status: 'created', notes };
  }
  return api().orders.create({ amount: amountPaise, currency, receipt, notes });
}

/** Payments on an order, newest first. Empty in mock mode. */
export async function orderPayments(orderId) {
  if (isMock()) return [];
  const res = await api().orders.fetchPayments(orderId);
  return (res?.items ?? []).sort((a, b) => b.created_at - a.created_at);
}

/** One payment, straight from Razorpay. Null in mock mode. */
export async function fetchPayment(paymentId) {
  if (isMock()) return null;
  return api().payments.fetch(paymentId);
}

export async function capturePayment(paymentId, amountPaise, currency) {
  if (isMock()) return null;
  return api().payments.capture(paymentId, amountPaise, currency);
}

export async function refundPayment(paymentId, amountPaise, notes) {
  if (isMock()) return { id: mockId('rfnd'), payment_id: paymentId, amount: amountPaise, status: 'processed' };
  return api().payments.refund(paymentId, { amount: amountPaise, notes });
}
