# Store /book leads in Google Sheets

For now, leads and bookings are stored in a Google Sheet through a small Apps
Script web app. This works on Vercel; the default local store does not, because
Vercel's file system is read-only.

Every form submission becomes a row, and the row updates as the student pays,
gets booked, or is refunded.

## 1. Create the sheet and the script (about 10 minutes)

1. Create a new Google Sheet in the HLS Google account, for example "HLS /book leads".
   Share it only with the people who need to see leads.
2. In the sheet: **Extensions → Apps Script**. Delete the sample code and paste
   the whole of [`scripts/google-sheets/Code.gs`](../scripts/google-sheets/Code.gs). Save.
3. Make a long random secret, for example by running `openssl rand -hex 32`.
   In Apps Script: **Project Settings** (gear icon) → **Script properties** →
   **Add script property**:
   - Property: `BOOK_SHEETS_SECRET`
   - Value: your secret
4. Back in the editor, choose the function `setup` in the toolbar and click
   **Run**. Approve the permissions Google asks for. This creates the `Leads`,
   `_index`, `_meta` and `Fallback` sheets.
5. **Deploy → New deployment → Select type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**. The secret is what protects it: requests
     without it get "unauthorized".
   - Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

After you change `Code.gs` later, use **Deploy → Manage deployments → Edit →
Version: New version**, so the URL stays the same.

## 2. Point the site at it

Add these environment variables in Vercel (**Project → Settings → Environment
Variables**), and in `.env.local` for local runs:

```
LEAD_STORE=google-sheets
BOOK_SHEETS_URL=<the Web app URL ending in /exec>
BOOK_SHEETS_SECRET=<the same secret as the script property>
```

Then redeploy. To check it: submit the form on `/book`. A row should appear in
`Leads` within a few seconds.

## 3. What the Leads sheet holds

There is one row per lead, with these columns: Lead ID, Created (IST), Name,
Mobile, Email, Attempt, Route, Page variant, Source (src), UTM source, UTM
medium, UTM campaign, UTM content, Referrer, Privacy notice accepted (IST),
Marketing: Email, Marketing: WhatsApp, Marketing: SMS, Status, Payment status,
Amount (INR), Slot (IST), Slot booked, Order ID, Payment ID, Paid at (IST),
Refund ID, Needs attention, Owner, Next action, Staff notes, Updated (IST), and
`record_json` (hidden; the full record the site reads).

- **You may edit:** Status (New, Booked, Attended, Blueprint delivered, In
  counselling, Enrolled, Refunded, Closed), Owner, Next action, Staff notes.
- **Do not edit:** other columns, `record_json`, or the hidden `_index` and
  `_meta` sheets. The site rewrites a row whenever that lead changes.
- **Fallback:** if a save ever fails, the lead is parked in `Fallback`. It is
  moved into `Leads` automatically after the next successful save.

Marksheets and mock papers never go to this sheet.

## Limits

- Each save takes about a second, so submitting the form takes 2 to 4 seconds.
  That is fine for a few hundred bookings, not for heavy traffic.
- Google allows about 30 script runs at the same moment per account.
- Back the sheet up: **File → Make a copy** on a schedule, or use version history.
- When HLS picks a CRM or database, it replaces this with an adapter that has
  the same methods (`lib/book/store/index.js`). The page and booking flow stay
  the same.
