import 'server-only';
import { getSlotConfig } from './config';

/**
 * Consultation slots. Until real availability is confirmed the source is
 * "synthetic": sample times for development, labelled as such on the page.
 * With SLOTS_SOURCE=config, SLOTS_CONFIG lists real start times.
 * All times are shown in India Standard Time.
 */

const IST_OFFSET_MIN = 330;
// Synthetic sample only. Not real availability.
const SYNTHETIC_TIMES = ['10:00', '11:00', '16:00', '17:00'];
const SYNTHETIC_DAYS = 7;
const MIN_NOTICE_MS = 60 * 60 * 1000;

const dayFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function istParts(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    day: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    hm: `${pad(shifted.getUTCHours())}${pad(shifted.getUTCMinutes())}`,
  };
}

export function describeSlot(startsAt) {
  const date = new Date(startsAt);
  const { day, hm } = istParts(date);
  return {
    id: `s-${day.replaceAll('-', '')}-${hm}`,
    startsAt: date.toISOString(),
    day,
    dayLabel: dayFmt.format(date),
    timeLabel: `${timeFmt.format(date).toUpperCase()} IST`,
  };
}

function syntheticSlots(now) {
  const today = istParts(new Date(now)).day;
  const base = Date.parse(`${today}T00:00:00+05:30`);
  const out = [];
  for (let d = 1; d <= SYNTHETIC_DAYS; d += 1) {
    for (const t of SYNTHETIC_TIMES) {
      const [h, m] = t.split(':').map(Number);
      out.push(describeSlot(base + d * 86400000 + (h * 60 + m) * 60000));
    }
  }
  return out;
}

export function allSlots(now = Date.now()) {
  const cfg = getSlotConfig();
  if (cfg.source === 'config') {
    return cfg.configured
      .map((s) => Date.parse(s))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)
      .map(describeSlot);
  }
  return syntheticSlots(now);
}

export function findSlot(slotId, now = Date.now()) {
  return allSlots(now).find((s) => s.id === slotId) ?? null;
}

export function sameDayIds(slot, now = Date.now()) {
  return allSlots(now)
    .filter((s) => s.day === slot.day)
    .map((s) => s.id);
}

/** Slots someone can book now: in the future, not taken, day not at capacity. */
export function availableSlots(taken, now = Date.now()) {
  const { capacityPerDay } = getSlotConfig();
  const takenSet = new Set(taken);
  const slots = allSlots(now).filter((s) => Date.parse(s.startsAt) - now > MIN_NOTICE_MS);
  const usedPerDay = {};
  for (const s of allSlots(now)) if (takenSet.has(s.id)) usedPerDay[s.day] = (usedPerDay[s.day] ?? 0) + 1;
  return slots.filter(
    (s) => !takenSet.has(s.id) && !(capacityPerDay && (usedPerDay[s.day] ?? 0) >= capacityPerDay),
  );
}
