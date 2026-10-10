import { z } from "zod";

// ---------------------------------------------------------------------------
// Screen time. Each player keeps running totals for the current day (local TV
// clock) and re-sends the whole day every 5 minutes. One blob per screen per
// day, so screens never write over each other. Re-sending is idempotent: the
// server keeps the larger of stored vs incoming for every counter, so a lost
// or repeated ping cannot double-count, and a player that lost its
// localStorage mid-day cannot erase what was already reported.
// ---------------------------------------------------------------------------

const DAY_SECS = 86400;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const dayStatsSchema = z.object({
  screen: z.string().regex(/^[a-z0-9-]{1,32}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  first: hhmm, // first time the player was seen that day
  last: hhmm, // last time it was seen
  on: z.number().int().min(0).max(DAY_SECS), // seconds the player was running
  hours: z.array(z.number().int().min(0).max(3600)).length(24), // seconds per clock hour
  slides: z
    .record(
      z.string().min(1).max(64),
      z.object({ s: z.number().int().min(0).max(DAY_SECS), n: z.number().int().min(0).max(100000) }),
    )
    .refine((r) => Object.keys(r).length <= 300, "prea multe postere"),
});

export type DayStats = z.infer<typeof dayStatsSchema>;

export function statsKey(date: string, screen: string): string {
  return `${date}__${screen}.json`;
}

export function mergeDay(a: DayStats | null, b: DayStats): DayStats {
  if (!a) return b;
  const slides: DayStats["slides"] = { ...a.slides };
  for (const [id, v] of Object.entries(b.slides)) {
    const o = slides[id];
    slides[id] = o ? { s: Math.max(o.s, v.s), n: Math.max(o.n, v.n) } : v;
  }
  return {
    screen: b.screen,
    date: b.date,
    first: a.first < b.first ? a.first : b.first,
    last: a.last > b.last ? a.last : b.last,
    on: Math.max(a.on, b.on),
    hours: a.hours.map((h, i) => Math.max(h, b.hours[i])),
    slides,
  };
}

/** Inclusive list of YYYY-MM-DD between two dates, capped. */
export function daysBetween(from: string, to: string, cap = 93): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end && out.length < cap) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function fmtDuration(secs: number): string {
  const m = Math.round(secs / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}
