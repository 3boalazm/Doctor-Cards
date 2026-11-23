// Extended public profile sections: workplaces, booking, working hours, credentials, services.
// Stored as one JSON object per card; every API route runs input through sanitizeExtras().

/** day: 0 = Sunday … 6 = Saturday (same as Date#getDay). Times are 24h "HH:MM" in clinic local time (Africa/Cairo). */
export type WorkingDay = { day: number; open: boolean; from: string; to: string };
export type ProfileExtras = {
  workplaces: string[];
  bookingUrl: string;
  bookingPhone: string;
  hours: WorkingDay[];
  hoursNote: string;
  credentials: string[];
  services: string[];
  /** Free text so staff can write "500 ج.م" or "350–500"; empty = hidden. */
  fees: { consultation: string; followUp: string };
  insurance: string[];
};

/** Display order: the Egyptian work week starts on Saturday. */
export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
export const CLINIC_TIME_ZONE = 'Africa/Cairo';
export const LIMITS = { workplaces: 5, credentials: 8, services: 16, insurance: 20, item: 120, note: 140, fee: 40 } as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const emptyExtras = (): ProfileExtras => ({ workplaces: [], bookingUrl: '', bookingPhone: '', hours: [], hoursNote: '', credentials: [], services: [], fees: { consultation: '', followUp: '' }, insurance: [] });
/** A full week, all closed, for editors to start from. */
export const defaultHours = (): WorkingDay[] => DAY_ORDER.map((day) => ({ day, open: false, from: '10:00', to: '18:00' }));
/** Fills any missing days so editors always show all seven rows, in display order. */
export const fullWeek = (hours: WorkingDay[]): WorkingDay[] => DAY_ORDER.map((day) => hours.find((item) => item.day === day) ?? { day, open: false, from: '10:00', to: '18:00' });

const text = (value: unknown, max: number) => (typeof value === 'string' ? value : value == null ? '' : String(value)).replace(/\s+/g, ' ').trim().slice(0, max);
function list(value: unknown, maxItems: number) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n/) : [];
  const seen = new Set<string>(); const out: string[] = [];
  for (const item of raw) {
    const clean = text(item, LIMITS.item);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean); out.push(clean);
    if (out.length >= maxItems) break;
  }
  return out;
}
function httpsUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try { const url = new URL(value.trim()); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
}
function hours(value: unknown): WorkingDay[] {
  if (!Array.isArray(value)) return [];
  const byDay = new Map<number, WorkingDay>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { day, open, from, to } = item as Record<string, unknown>;
    const index = Number(day);
    if (!Number.isInteger(index) || index < 0 || index > 6 || byDay.has(index)) continue;
    const valid = typeof from === 'string' && typeof to === 'string' && TIME.test(from) && TIME.test(to) && from !== to;
    byDay.set(index, { day: index, open: open === true && valid, from: valid ? from : '10:00', to: valid ? to : '18:00' });
  }
  const week = DAY_ORDER.filter((day) => byDay.has(day)).map((day) => byDay.get(day)!);
  return week.some((item) => item.open) ? week : [];
}

/** Accepts untrusted input (lists may be arrays or newline-separated text) and returns a safe, bounded object. */
export function sanitizeExtras(input: unknown): ProfileExtras {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    workplaces: list(source.workplaces, LIMITS.workplaces),
    bookingUrl: httpsUrl(source.bookingUrl),
    bookingPhone: text(source.bookingPhone, 40),
    hours: hours(source.hours),
    hoursNote: text(source.hoursNote, LIMITS.note),
    credentials: list(source.credentials, LIMITS.credentials),
    services: list(source.services, LIMITS.services),
    fees: (() => { const fees = source.fees && typeof source.fees === 'object' ? source.fees as Record<string, unknown> : {}; return { consultation: text(fees.consultation, LIMITS.fee), followUp: text(fees.followUp, LIMITS.fee) }; })(),
    insurance: list(source.insurance, LIMITS.insurance),
  };
}
/** For values read back from storage (may be missing on older records, or a JSON string from Postgres). */
export function normalizeExtras(value: unknown): ProfileExtras {
  if (typeof value === 'string') { try { return sanitizeExtras(JSON.parse(value)); } catch { return emptyExtras(); } }
  return sanitizeExtras(value);
}

/** Current weekday and minutes-since-midnight at the clinic, regardless of the visitor's own time zone. */
export function clinicNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CLINIC_TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Open/closed state, handling shifts that run past midnight (e.g. 18:00–01:00). */
export function openStatus(week: WorkingDay[], now = clinicNow()): { open: boolean; closesAt?: string; next?: { day: number; from: string } } {
  const byDay = new Map(week.map((item) => [item.day, item]));
  const today = byDay.get(now.day);
  if (today?.open) {
    const from = toMinutes(today.from), to = toMinutes(today.to);
    if (to > from ? now.minutes >= from && now.minutes < to : now.minutes >= from) return { open: true, closesAt: today.to };
  }
  const yesterday = byDay.get((now.day + 6) % 7);
  if (yesterday?.open && toMinutes(yesterday.to) < toMinutes(yesterday.from) && now.minutes < toMinutes(yesterday.to)) return { open: true, closesAt: yesterday.to };
  for (let offset = 0; offset < 8; offset += 1) {
    const day = (now.day + offset) % 7; const entry = byDay.get(day);
    if (!entry?.open) continue;
    if (offset === 0 && now.minutes >= toMinutes(entry.from)) continue;
    return { open: false, next: { day, from: entry.from } };
  }
  return { open: false };
}
