# /book: Blueprint Consultation landing page (v1)

The paid-consultation page for CA Final Group 1 repeaters. It sells one thing,
the Blueprint Consultation (₹3,000 inclusive of all taxes), and describes the
Score Improvement Programme without a price. It is `noindex` until launch is
approved, and payments are Razorpay test mode only.

## Layout

The app now has two root layouts, so `/book` inherits nothing from the teaser
(no preloader, cursor, smooth scroll, GSAP or black body):

| Path | What |
| --- | --- |
| `app/(site)/` | The teaser, moved unchanged (`layout.js`, `page.js`, `globals.css`) |
| `app/(book)/` | `/book` root layout (light theme, same fonts and tokens), pages and legal drafts |
| `app/(book)/book/v/[variant]` | Static pages for `?v=b` and `?v=c` (rewritten in `next.config.mjs`) |
| `app/api/book/*` | Lead, slots, hold, order, verify, webhook, status, mock checkout, admin |
| `components/book/` | Page sections, booking widget, confirmation |
| `lib/book/` | Config, booking service, Razorpay gateway, store and adapters |
| `public/book/` | Optimised logos, crest and share image (`npm run assets:book`) |

## Configuration

Every business value is an environment variable read through `lib/book/config.js`.
`.env.example` lists the names. `NEXT_PUBLIC_*` values are rendered on the page
and are fixed at build time, so rebuild after changing them (the pages are static).
Unset display values are hidden or shown as "to be confirmed". In `next dev`
they show an orange TODO marker instead.

Approval-gated content (mentor bio and photo, testimonials, sample blueprint,
owners) lives in `lib/book/content.js` and is empty by default. Variant B needs
an approved sample blueprint; without one it shows variant A and the lead
records `variant: "a"` and `variantRequested: "b"`.

## Payments

Testing currently uses Tach's Razorpay test account while HLS's own account is
under review, so checkout shows Tach's name and logo. When HLS's account is
approved, replace the keys and webhook secret in `.env.local`, register the
webhook on that account, and re-run one test payment and one refund. No code
changes are needed.

- `RAZORPAY_MODE=test` with `rzp_test_` keys. Live keys are refused.
- `RAZORPAY_MODE=mock` (plus `BOOK_TEST_HOOKS=true`) runs a labelled, simulated
  checkout with no Razorpay calls. Development only.
- The amount comes from `CONSULTATION_FEE_INR` on the server. The browser never sends one.
- Paid state comes only from Razorpay: the signed webhook, or, if a webhook is
  late, a server-to-server fetch of the order's payments. The checkout callback
  only has its signature checked.
- Webhook URL: `/api/book/webhook`. Events: `payment.captured`, `order.paid`,
  `payment.failed`, `payment.authorized`, `refund.created`, `refund.processed`,
  `refund.failed`. Duplicates are ignored by `X-Razorpay-Event-Id`.

## Storage

`LEAD_STORE=local-json` writes `.data/book-store.json` (gitignored), with one
lock per process. It is for development and a single-server preview only. Swap
it for the chosen CRM or database by adding an adapter with the same methods
(listed in `lib/book/store/index.js`). If a save fails, the lead goes to
`.data/lead-fallback.ndjson` and is moved into the store on the next good save.

## Admin

With `BOOK_ADMIN_TOKEN` set (send it as `Authorization: Bearer …`):

- `GET /api/book/admin/leads` (all) or `?id=lead_…` (one)
- `PATCH /api/book/admin/leads` `{ leadId, status, owner, nextAction, note }`.
  Statuses: New, Booked, Attended, Blueprint delivered, In counselling, Enrolled, Refunded, Closed.
- `POST /api/book/admin/refund` `{ leadId, reason }`: full refund
- `POST /api/book/admin/reconcile`: asks Razorpay about every open unpaid order
  and books any that were paid. A backstop for missed webhooks; safe to run on a schedule.

## Checks

```
npm run lint                          # new /book code
npm run build                         # must finish with no warnings
npx next start -p 3300
BASE_URL=http://localhost:3300 npm run test:book   # payment and booking cases
```

`test:book` needs `BOOK_ADMIN_TOKEN` and `BOOK_TEST_HOOKS=true` in `.env.local`,
plus mock mode or test keys with the webhook secret. It signs webhooks locally
the same way Razorpay does. In test mode it creates real Razorpay test orders;
its refund case only runs in mock mode, because a refund needs a real payment.

Real test payments: in Razorpay's test checkout choose Netbanking, any bank,
then "Success" or "Failure" on the demo bank page. Razorpay ignores obvious
dummy mobile numbers such as 9876543210 in prefill, so use another number.

To receive Razorpay's own webhooks locally, run `cloudflared tunnel --url
http://localhost:3300` and add `<tunnel URL>/api/book/webhook` in the Razorpay
dashboard (Settings → Webhooks, test mode) with the same secret as
`RAZORPAY_WEBHOOK_SECRET` and the events listed above.

## Still needed before launch

- Razorpay delivering its own webhooks (register the URL in the dashboard). Test-mode payments, failures, cancel, refund and reconcile were run for real on 19 Oct 2026.
- Real phone checks in the Instagram and WhatsApp in-app browsers.
- Values for every unset env var, approved legal text, and the PM decisions in the build report.
