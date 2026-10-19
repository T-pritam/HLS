# Store /book leads in Google Sheets

For now, leads and bookings are stored in a Google Sheet. The website can't
write to a Google Sheet on its own, so a small Apps Script web app inside the
sheet receives the writes. This works on Vercel; the default local store does
not, because Vercel's file system is read-only.

Every form submission becomes a row, and that row updates as the student pays,
gets booked, or is refunded.

## 1. Make the sheet: upload the template (easiest)

1. Download [`scripts/google-sheets/hls-book-leads-template.xlsx`](../scripts/google-sheets/hls-book-leads-template.xlsx).
2. In Google Drive: **New → File upload**, pick the file, then open it with
   **Google Sheets**. If Drive opens it as an `.xlsx` (with a green "XLSX" badge
   next to the name), use **File → Save as Google Sheets** and work in the copy.
3. Check you see the tabs **Leads** and **Fallback**. `_index` and `_meta` are
   hidden on purpose. Share the sheet only with people who should see leads.

If you prefer: [`hls-book-leads-header.csv`](../scripts/google-sheets/hls-book-leads-header.csv)
holds only the Leads header row. Upload it the same way and rename its tab to
`Leads`; the script adds the other tabs on first use.

## 2. Add the script

1. In the Google Sheet (not from script.google.com): **Extensions → Apps Script**.
2. Delete the sample code and paste the whole of
   [`scripts/google-sheets/Code.gs`](../scripts/google-sheets/Code.gs). Click **Save**.
3. Make a long random secret, for example with `openssl rand -hex 32`. Then go to
   **Project Settings** (gear icon) → **Script properties** → **Add script property**:
   - Property: `BOOK_SHEETS_SECRET`
   - Value: your secret
   - **Save script properties**
4. Back in the editor, choose **setup** in the function list and click **Run**.
   - Google asks for permission the first time: **Review permissions**, choose
     your account, then **Advanced → Go to (project name) (unsafe) → Allow**.
     The warning appears because the script is yours and not published; it only
     touches this sheet.
   - The **Execution log** should say `Sheets ready…` and
     `BOOK_SHEETS_SECRET is set.`
   - With the template you can skip this run; the web app checks the tabs on
     every call. The permission prompt then appears when you deploy.

## 3. Deploy it as a web app

1. **Deploy → New deployment**, then the gear next to "Select type" → **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. (The secret protects it:
   requests without it get `unauthorized`.)
3. **Deploy** and copy the **Web app URL**. It ends in `/exec`.
4. To check: open the URL in a browser. It should say
   `HLS /book lead store is running.`

When you change `Code.gs` later, use **Deploy → Manage deployments → Edit →
Version: New version**, so the URL stays the same.

## 4. Point the site at it

Add these in Vercel (**Project → Settings → Environment Variables**), and in
`.env.local` for local runs:

```
LEAD_STORE=google-sheets
BOOK_SHEETS_URL=<the Web app URL ending in /exec>
BOOK_SHEETS_SECRET=<the same secret as the script property>
```

Redeploy, then submit the form on `/book`. A row should appear in **Leads**
within a few seconds.

## If something goes wrong

| What you see | Fix |
| --- | --- |
| `The coordinates of the range are outside the dimensions of the sheet` | The old script did this. Paste the current `Code.gs` again, save, and run `setup` again. |
| `No spreadsheet. Open the script from the sheet…` | The script was made at script.google.com, so it isn't attached to a sheet. Either recreate it via **Extensions → Apps Script** in the sheet, or add a script property `SPREADSHEET_ID` with the sheet ID (the long code in the sheet's URL, between `/d/` and `/edit`). |
| "Google hasn't verified this app" | Expected for your own script: **Advanced → Go to … (unsafe) → Allow**. |
| The form still says "We could not save your details" | Check the three Vercel variables, that the URL ends in `/exec`, and that the secret matches exactly. Then redeploy. Vercel's function logs show the exact error. |
| `unauthorized` | `BOOK_SHEETS_SECRET` differs between the script property and Vercel. |

## What the Leads sheet holds

There is one row per lead, with these columns: Lead ID, Created (IST), Name,
Mobile, Email, Attempt, Route, Page variant, Source (src), UTM source, UTM
medium, UTM campaign, UTM content, Referrer, Privacy notice accepted (IST),
Marketing: Email, Marketing: WhatsApp, Marketing: SMS, Status, Payment status,
Amount (INR), Slot (IST), Slot booked, Order ID, Payment ID, Paid at (IST),
Refund ID, Needs attention, Owner, Next action, Staff notes, Updated (IST), and
`record_json` (hidden; the full record the site reads).

- **You may edit:** Status (pick from the list), Owner, Next action, Staff notes.
- **Do not edit:** other columns, `record_json`, or the hidden `_index` and
  `_meta` tabs. The site rewrites a row whenever that lead changes.
- **Fallback:** if a save ever fails, the lead is parked in **Fallback** and
  moved into **Leads** after the next successful save.

Marksheets and mock papers never go to this sheet.

## Limits

- Each save takes about a second, so submitting the form takes 2 to 4 seconds.
  That is fine for a few hundred bookings, not for heavy traffic.
- Back the sheet up regularly (**File → Make a copy**, or version history).
- When HLS picks a CRM or database, it replaces this with an adapter that has
  the same methods (`lib/book/store/index.js`). The page and booking flow stay
  the same.
