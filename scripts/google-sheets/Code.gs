/**
 * HLS /book lead store: Google Apps Script web app for a Google Sheet.
 *
 * Paste this into Extensions → Apps Script of the leads spreadsheet (or set the
 * script property SPREADSHEET_ID if the script is standalone), set the script
 * property BOOK_SHEETS_SECRET, run setup() once, then deploy as a web app
 * (Execute as: Me, Who has access: Anyone). The sheets can also come from the
 * template file hls-book-leads-template.xlsx. Full steps:
 * docs/google-sheets-setup.md in the website repo.
 *
 * Sheets it manages:
 *   Leads     one row per lead, readable columns plus record_json (hidden)
 *   _index    lookups the booking system needs (orders, holds, bookings…)
 *   _meta     a version number, so two writes can never overwrite each other
 *   Fallback  leads parked when a normal save failed; moved into Leads later
 *
 * You may edit these Leads columns by hand: Status, Owner, Next action,
 * Staff notes. Do not edit other columns, record_json or the _index/_meta sheets.
 */

var LEADS = 'Leads';
var INDEX = '_index';
var META = '_meta';
var FALLBACK = 'Fallback';
var TZ = 'Asia/Kolkata';

var STATUSES = ['New', 'Booked', 'Attended', 'Blueprint delivered', 'In counselling', 'Enrolled', 'Refunded', 'Closed'];
var ATTEMPTS = { 'this': 'This attempt', 'next': 'Next attempt', 'unsure': 'Not sure' };

function ist_(iso) {
  return iso ? Utilities.formatDate(new Date(iso), TZ, 'yyyy-MM-dd HH:mm') : '';
}
function src_(l) {
  return l.source || {};
}
function optin_(l, channel) {
  var m = (l.consent && l.consent.marketing && l.consent.marketing[channel]) || {};
  return m.granted ? 'Yes (' + ist_(m.at) + ')' : 'No';
}

// [header, value from the lead record]. Order here is the column order.
var COLUMNS = [
  ['Lead ID', function (l) { return l.id; }],
  ['Created (IST)', function (l) { return ist_(l.createdAt); }],
  ['Name', function (l) { return l.name; }],
  ['Mobile', function (l) { return l.mobile; }],
  ['Email', function (l) { return l.email; }],
  ['Attempt', function (l) { return ATTEMPTS[l.attempt] || l.attempt; }],
  ['Route', function (l) { return l.route; }],
  ['Page variant', function (l) { return l.variant; }],
  ['Source (src)', function (l) { return src_(l).src; }],
  ['UTM source', function (l) { return src_(l).utmSource; }],
  ['UTM medium', function (l) { return src_(l).utmMedium; }],
  ['UTM campaign', function (l) { return src_(l).utmCampaign; }],
  ['UTM content', function (l) { return src_(l).utmContent; }],
  ['Referrer', function (l) { return src_(l).referrer; }],
  ['Privacy notice accepted (IST)', function (l) {
    return ist_(l.consent && l.consent.privacyNotice && l.consent.privacyNotice.at);
  }],
  ['Marketing: Email', function (l) { return optin_(l, 'email'); }],
  ['Marketing: WhatsApp', function (l) { return optin_(l, 'whatsapp'); }],
  ['Marketing: SMS', function (l) { return optin_(l, 'sms'); }],
  ['Status', function (l) { return l.status; }],
  ['Payment status', function (l) { return l.paymentStatus; }],
  ['Amount (INR)', function (l) { return l.amountPaise ? String(l.amountPaise / 100) : ''; }],
  ['Slot (IST)', function (l) { return l.slot ? l.slot.dayLabel + ', ' + l.slot.timeLabel : ''; }],
  ['Slot booked', function (l) { return l.slotBooked ? 'Yes' : 'No'; }],
  ['Order ID', function (l) { return l.orderId; }],
  ['Payment ID', function (l) { return l.paymentId; }],
  ['Paid at (IST)', function (l) { return ist_(l.paidAt); }],
  ['Refund ID', function (l) { return l.refundId; }],
  ['Needs attention', function (l) { return l.needsAttention; }],
  ['Owner', function (l) { return l.owner; }],
  ['Next action', function (l) { return l.nextAction; }],
  ['Staff notes', function (l) { return l.staffNotes; }],
  ['Updated (IST)', function (l) { return ist_(l.updatedAt); }],
  ['record_json', function (l) { return JSON.stringify(l); }],
];
var HEADERS = COLUMNS.map(function (c) { return c[0]; });
var JSON_COL = HEADERS.length - 1;
// Columns staff may edit in the sheet, and the record field each one sets.
var EDITABLE = { 'Status': 'status', 'Owner': 'owner', 'Next action': 'nextAction', 'Staff notes': 'staffNotes' };

/* ------------------------------------------------------------------ */

function doGet() {
  return ContentService.createTextOutput('HLS /book lead store is running.');
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'bad request' });
  }
  var secret = PropertiesService.getScriptProperties().getProperty('BOOK_SHEETS_SECRET');
  if (!secret || req.secret !== secret) return out_({ ok: false, error: 'unauthorized' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out_({ ok: false, error: 'busy' });
  try {
    setup_();
    switch (req.action) {
      case 'ping': return out_({ ok: true, version: version_() });
      case 'load': return out_(load_(req));
      case 'commit': return out_(commit_(req));
      case 'fallback': return out_(fallback_(req));
      case 'readFallback': return out_(readFallback_());
      case 'clearFallback': return out_(clearFallback_(req));
      default: return out_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run once from the editor (choose "setup", then Run). Creates or checks the
 * sheets and writes a short report to the execution log. Safe to run again.
 */
function setup() {
  setup_();
  var hasSecret = Boolean(PropertiesService.getScriptProperties().getProperty('BOOK_SHEETS_SECRET'));
  Logger.log('Sheets ready in "' + ss_().getName() + '".');
  Logger.log(hasSecret ? 'BOOK_SHEETS_SECRET is set.' : 'BOOK_SHEETS_SECRET is NOT set yet: add it under Project Settings → Script properties.');
}

/** The leads spreadsheet: the one this script is attached to, or SPREADSHEET_ID. */
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
  if (!ss) {
    throw new Error('No spreadsheet. Open the script from the sheet (Extensions → Apps Script), or set the script property SPREADSHEET_ID.');
  }
  return ss;
}

/** New sheets have 1000 rows and 26 columns; grow them before writing past that. */
function ensureSize_(sheet, rows, cols) {
  var maxRows = sheet.getMaxRows();
  if (rows > maxRows) sheet.insertRowsAfter(maxRows, rows - maxRows);
  var maxCols = sheet.getMaxColumns();
  if (cols > maxCols) sheet.insertColumnsAfter(maxCols, cols - maxCols);
}

/** Creates any missing sheet and header (also fixes sheets made from the template or a CSV). */
function sheet_(ss, name, header, hide) {
  var sheet = ss.getSheetByName(name);
  var created = !sheet;
  if (created) sheet = ss.insertSheet(name);
  ensureSize_(sheet, 2, header.length);
  var first = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  if (String(first[0]) !== String(header[0])) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (created) {
    if (name !== META) sheet.getRange(1, 1, sheet.getMaxRows(), header.length).setNumberFormat('@');
    if (hide) sheet.hideSheet();
  }
  return sheet;
}

function setup_() {
  var ss = ss_();
  var leads = sheet_(ss, LEADS, HEADERS, false);
  if (!leads.isColumnHiddenByUser(JSON_COL + 1)) leads.hideColumns(JSON_COL + 1);
  sheet_(ss, INDEX, ['type', 'key', 'value'], true);
  sheet_(ss, META, ['version', 0], true);
  sheet_(ss, FALLBACK, ['fid', 'at', 'record_json'], false);
}

function version_() {
  return Number(ss_().getSheetByName(META).getRange(1, 2).getValue()) || 0;
}

function rows_(sheet, width) {
  var last = sheet.getLastRow();
  return last < 2 ? [] : sheet.getRange(2, 1, last - 1, width).getValues();
}

/** Text that would start a formula is stored as plain text. */
function cell_(v) {
  if (v === null || v === undefined) return '';
  v = String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/* ------------------------------------------------------------------ */

function load_(req) {
  var ss = ss_();
  var index = rows_(ss.getSheetByName(INDEX), 3).filter(function (r) { return r[0]; });
  var want = req.leadIds;
  var leads = [];
  if (want === 'all' || (want && want.length)) {
    var set = {};
    if (want !== 'all') want.forEach(function (id) { set[id] = true; });
    rows_(ss.getSheetByName(LEADS), HEADERS.length).forEach(function (row) {
      if (!row[0] || (want !== 'all' && !set[row[0]])) return;
      var lead;
      try {
        lead = JSON.parse(row[JSON_COL]);
      } catch (err) {
        return;
      }
      // Hand edits to the editable columns win over the stored record.
      HEADERS.forEach(function (h, i) {
        var field = EDITABLE[h];
        if (!field) return;
        var shown = row[i] === null || row[i] === undefined ? '' : String(row[i]);
        var stored = lead[field] === null || lead[field] === undefined ? '' : String(lead[field]);
        if (shown === stored) return;
        if (field === 'status' && STATUSES.indexOf(shown) < 0) return;
        lead[field] = shown === '' ? null : shown;
      });
      leads.push(lead);
    });
  }
  return { ok: true, version: version_(), leads: leads, index: index };
}

function commit_(req) {
  var ss = ss_();
  var current = version_();
  if (Number(req.version) !== current) return { ok: false, conflict: true, version: current };

  // Leads: update the row with the same Lead ID, or append.
  var sheet = ss.getSheetByName(LEADS);
  var ids = rows_(sheet, 1).map(function (r) { return r[0]; });
  var appends = [];
  (req.leads || []).forEach(function (lead) {
    var row = COLUMNS.map(function (c) { return cell_(c[1](lead)); });
    row[JSON_COL] = JSON.stringify(lead);
    var at = ids.indexOf(lead.id);
    if (at >= 0) sheet.getRange(at + 2, 1, 1, row.length).setValues([row]);
    else appends.push(row);
  });
  if (appends.length) {
    var start = sheet.getLastRow() + 1;
    ensureSize_(sheet, start + appends.length - 1, HEADERS.length);
    sheet.getRange(start, 1, appends.length, HEADERS.length).setNumberFormat('@').setValues(appends);
  }

  // Index: apply sets and deletes, then rewrite the sheet.
  var idxSheet = ss.getSheetByName(INDEX);
  var map = {};
  var order = [];
  rows_(idxSheet, 3).forEach(function (r) {
    if (!r[0]) return;
    var k = r[0] + '\u0000' + r[1];
    if (!(k in map)) order.push(k);
    map[k] = String(r[2]);
  });
  (req.set || []).forEach(function (s) {
    var k = s[0] + '\u0000' + s[1];
    if (!(k in map)) order.push(k);
    map[k] = String(s[2]);
  });
  (req.del || []).forEach(function (d) { delete map[d[0] + '\u0000' + d[1]]; });
  var data = order.filter(function (k) { return k in map; }).map(function (k) {
    var p = k.split('\u0000');
    return [p[0], p[1], map[k]];
  });
  var last = idxSheet.getLastRow();
  if (last > 1) idxSheet.getRange(2, 1, last - 1, 3).clearContent();
  if (data.length) {
    ensureSize_(idxSheet, data.length + 1, 3);
    idxSheet.getRange(2, 1, data.length, 3).setNumberFormat('@').setValues(data);
  }

  ss.getSheetByName(META).getRange(1, 2).setValue(current + 1);
  SpreadsheetApp.flush();
  return { ok: true, version: current + 1 };
}

/* ------------------------------------------------------------------ */

function fallback_(req) {
  var sheet = ss_().getSheetByName(FALLBACK);
  sheet.appendRow([req.fid, new Date().toISOString(), JSON.stringify(req.record)]);
  return { ok: true };
}

function readFallback_() {
  var records = rows_(ss_().getSheetByName(FALLBACK), 3)
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      var record = null;
      try { record = JSON.parse(r[2]); } catch (err) {}
      return { fid: String(r[0]), record: record };
    });
  return { ok: true, records: records };
}

function clearFallback_(req) {
  var sheet = ss_().getSheetByName(FALLBACK);
  var done = {};
  (req.fids || []).forEach(function (f) { done[f] = true; });
  var keep = rows_(sheet, 3).filter(function (r) { return r[0] && !done[r[0]]; });
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, 3).clearContent();
  if (keep.length) sheet.getRange(2, 1, keep.length, 3).setValues(keep);
  return { ok: true };
}
