import { newId, type Fixture } from "./content";

// Bulk import of fixtures from pasted text. One match per line. Accepted shapes:
//
//   20.10 21:00 Real Madrid - Barcelona | La Liga
//   20.10.2026 21:00 Real Madrid vs Barcelona
//   2026-10-20 21:00 Arsenal – Liverpool | Premier League
//   20.10<TAB>21:00<TAB>Arsenal<TAB>Liverpool<TAB>Premier League      (pasted from Excel / Sheets)
//   20.10;21:00;Arsenal;Liverpool;Premier League                       (CSV with ; or ,)
//
// A date without a year means the next occurrence of that day (today or later).
// Lines starting with # and empty lines are ignored.

export type ParsedLine =
  | { ok: true; line: number; raw: string; fixture: Fixture; duplicate: boolean }
  | { ok: false; line: number; raw: string; error: string };

const SEP = /\s+(?:-|–|—|vs\.?|v)\s+/i;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function resolveDate(day: number, month: number, year: number | null, now: Date): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year !== null) {
    const d = new Date(year, month - 1, day);
    return d.getMonth() === month - 1 ? d : null;
  }
  // No year: this year, unless that date is already more than a day in the past.
  let d = new Date(now.getFullYear(), month - 1, day);
  if (d.getMonth() !== month - 1) return null;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d < yesterday) d = new Date(now.getFullYear() + 1, month - 1, day);
  return d;
}

function parseDateToken(tok: string, now: Date): Date | null {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(tok);
  if (m) return resolveDate(+m[3], +m[2], +m[1], now);
  m = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/.exec(tok);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
    return resolveDate(+m[1], +m[2], y, now);
  }
  return null;
}

function parseTimeToken(tok: string): [number, number] | null {
  const m = /^(\d{1,2})[:.hH](\d{2})$/.exec(tok);
  if (!m) return null;
  const h = +m[1];
  const mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return [h, mi];
}

function toKick(d: Date, h: number, mi: number): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(mi)}`;
}

function splitColumns(line: string): string[] | null {
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  if ((line.match(/;/g) || []).length >= 3) return line.split(";").map((s) => s.trim());
  // comma CSV only when it clearly has 4+ cells and no "A - B" pattern
  if ((line.match(/,/g) || []).length >= 3 && !SEP.test(line)) return line.split(",").map((s) => s.trim());
  return null;
}

export function parseFixtureLine(raw: string, lineNo: number, now: Date, existing: Fixture[]): ParsedLine | null {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return null;
  const fail = (error: string): ParsedLine => ({ ok: false, line: lineNo, raw, error });

  let date: Date | null = null;
  let time: [number, number] | null = null;
  let home = "";
  let away = "";
  let comp = "";

  const cols = splitColumns(line);
  if (cols) {
    if (cols.length < 4) return fail("Trebuie minimum 4 coloane: dată, oră, gazde, oaspeți");
    date = parseDateToken(cols[0], now);
    time = parseTimeToken(cols[1]);
    home = cols[2];
    away = cols[3];
    comp = cols[4] || "";
  } else {
    const parts = line.split(/\s+/);
    date = parseDateToken(parts[0] || "", now);
    time = parseTimeToken(parts[1] || "");
    const rest = parts.slice(2).join(" ");
    const [teams, ...compParts] = rest.split("|");
    comp = compParts.join("|").trim();
    const t = teams.split(SEP);
    if (t.length !== 2) return fail("Nu găsesc echipele. Scrie „Gazde - Oaspeți”");
    home = t[0].trim();
    away = t[1].trim();
  }

  if (!date) return fail("Data lipsește sau e greșită (ex. 20.10 sau 20.10.2026)");
  if (!time) return fail("Ora lipsește sau e greșită (ex. 21:00)");
  if (!home || !away) return fail("Lipsește o echipă");

  const kick = toKick(date, time[0], time[1]);
  const key = (f: { home: string; away: string; kick: string }) => `${f.home.toLowerCase()}|${f.away.toLowerCase()}|${f.kick}`;
  const duplicate = existing.some((f) => key(f) === key({ home, away, kick }));
  return { ok: true, line: lineNo, raw, duplicate, fixture: { id: newId("f"), home, away, comp, kick } };
}

export function parseFixtures(text: string, existing: Fixture[], now: Date = new Date()): ParsedLine[] {
  const out: ParsedLine[] = [];
  const seen: Fixture[] = [...existing];
  text.split(/\r?\n/).forEach((raw, i) => {
    const r = parseFixtureLine(raw, i + 1, now, seen);
    if (!r) return;
    out.push(r);
    if (r.ok && !r.duplicate) seen.push(r.fixture); // the same line pasted twice counts once
  });
  return out;
}

export const IMPORT_EXAMPLE = `20.10 21:00 Real Madrid - Barcelona | La Liga
21.10 19:30 Arsenal - Liverpool | Premier League
22.10 22:00 Inter vs Milan | Serie A`;
