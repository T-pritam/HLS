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

## Checks

```
npm run lint                          # new /book code
npm run build                         # must finish with no warnings
npx next start -p 3300
BASE_URL=http://localhost:3300 npm run test:book   # payment and booking cases
```

`test:book` needs `BOOK_ADMIN_TOKEN` and `BOOK_TEST_HOOKS=true` in `.env.local`,
plus mock mode or test keys with the webhook secret. It signs webhooks locally
the same way Razorpay does.

## Still needed before launch

- Real Razorpay test run with your keys and a tunnel to `/api/book/webhook`.
- Real phone checks in the Instagram and WhatsApp in-app browsers.
- Values for every unset env var, approved legal text, and the PM decisions in the build report.
