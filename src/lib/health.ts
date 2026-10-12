import { CONTENT_KEY, store } from "./blobs";
import { dayStatsSchema } from "./stats";

// What /api/health reports. "ok" is false when storage fails or when a real
// screen (one that ran at least an hour today) has gone quiet: that is the
// mini PC off, Chrome closed, or no internet in the bar.

const TZ = "Europe/Chisinau";
const STALE_MIN = 20; // players report every 5 min
const REAL_SCREEN_SECS = 3600; // ignore a phone that opened /tv for a minute

export type Health = {
  ok: boolean;
  checkedAt: string;
  storage: { ok: boolean; ms: number; error?: string };
  screens: { screen: string; lastSeen: string; minutesAgo: number; onToday: string; stale: boolean }[];
  problems: string[];
  watchdog: { lastRun: string | null; alerts: "telegram" | "neconfigurat"; lastAlert?: unknown };
};

function localNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    return fn();
  }
}

export async function checkHealth(): Promise<Health> {
  const problems: string[] = [];
  const t0 = Date.now();
  let storage: Health["storage"];
  try {
    const raw = await withRetry(() => store("content").getJSON(CONTENT_KEY));
    storage = { ok: raw !== null, ms: Date.now() - t0 };
    if (!raw) {
      storage.error = "content.json lipsește";
      problems.push("Conținutul nu a fost găsit în stocare");
    }
  } catch (e) {
    storage = { ok: false, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
    problems.push(`Stocarea nu răspunde: ${storage.error}`);
  }

  const screens: Health["screens"] = [];
  if (storage.ok) {
    const now = localNow();
    try {
      const kv = store("stats");
      const keys = (await kv.list(now.date)).filter((k) => k.startsWith(`${now.date}__`));
      for (const k of keys) {
        const p = dayStatsSchema.safeParse(await kv.getJSON(k));
        if (!p.success || p.data.on < REAL_SCREEN_SECS) continue;
        const [h, m] = p.data.last.split(":").map(Number);
        const ago = Math.max(0, now.minutes - (h * 60 + m));
        const stale = ago > STALE_MIN;
        screens.push({
          screen: p.data.screen,
          lastSeen: p.data.last,
          minutesAgo: ago,
          onToday: `${Math.floor(p.data.on / 3600)}h ${Math.round((p.data.on % 3600) / 60)}m`,
          stale,
        });
        if (stale) problems.push(`Ecranul ${p.data.screen} nu a mai dat semn de ${ago} min (ultima dată ${p.data.last})`);
      }
    } catch (e) {
      problems.push(`Nu am putut citi starea ecranelor: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // The scheduled watchdog (netlify/functions/watchdog.mjs) leaves its state here.
  let watchdog: Health["watchdog"] = {
    lastRun: null,
    alerts: process.env.TELEGRAM_BOT_TOKEN ? "telegram" : "neconfigurat",
  };
  if (storage.ok) {
    try {
      const w = (await store("stats").getJSON("watchdog.json")) as { lastRun?: string; lastAlert?: unknown } | null;
      if (w?.lastRun) {
        watchdog = { ...watchdog, lastRun: w.lastRun, lastAlert: w.lastAlert };
        const mins = (Date.now() - Date.parse(w.lastRun)) / 60000;
        if (mins > 30) problems.push(`Verificarea automată nu a mai rulat de ${Math.round(mins)} min`);
      }
    } catch {
      /* reported through storage */
    }
  }

  return { ok: problems.length === 0, checkedAt: new Date().toISOString(), storage, screens, problems, watchdog };
}
