import type { Slide } from "./content";

// Mirrors the logic inside public/tv.html. Keep both in sync.
// All comparisons are in the *local* time of the machine evaluating them.

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHours(hours: string): [number, number] | null {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(hours);
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

/** Monday = 1 … Sunday = 7 */
export function isoWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export type WindowState = "on" | "off" | "outside";

/** Is the slide inside its date / hours / weekday window right now? Ignores `active`. */
export function inWindow(slide: Slide, now: Date = new Date()): boolean {
  const today = ymd(now);
  if (slide.from && today < slide.from) return false;
  if (slide.to && today > slide.to) return false;
  if (slide.days.length && !slide.days.includes(isoWeekday(now))) return false;
  if (slide.hours) {
    const r = parseHours(slide.hours);
    if (r) {
      const m = minutesOfDay(now);
      const [a, b] = r;
      // Support windows that cross midnight, e.g. 22:00-02:00.
      const inside = a <= b ? m >= a && m < b : m >= a || m < b;
      if (!inside) return false;
    }
  }
  return true;
}

export function windowState(slide: Slide, now: Date = new Date()): WindowState {
  if (!slide.active) return "off";
  return inWindow(slide, now) ? "on" : "outside";
}

const RO_MONTHS = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sept", "oct", "nov", "dec"];
const RO_DAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];

function fmtDate(s: string): string {
  const [, m, d] = s.split("-");
  return `${Number(d)} ${RO_MONTHS[Number(m) - 1]}`;
}

/** Short human summary of the window for list rows. Empty string = always on. */
export function describeWindow(slide: Slide): string {
  const parts: string[] = [];
  if (slide.from && slide.to) parts.push(`${fmtDate(slide.from)} – ${fmtDate(slide.to)}`);
  else if (slide.from) parts.push(`din ${fmtDate(slide.from)}`);
  else if (slide.to) parts.push(`până ${fmtDate(slide.to)}`);
  if (slide.hours) parts.push(slide.hours.replace("-", "–"));
  if (slide.days.length && slide.days.length < 7) {
    const sorted = [...slide.days].sort((a, b) => a - b);
    parts.push(sorted.map((d) => RO_DAYS[d - 1]).join(" "));
  }
  return parts.join(" · ");
}
