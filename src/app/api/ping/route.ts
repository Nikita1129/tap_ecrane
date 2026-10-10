import { NextResponse, type NextRequest } from "next/server";
import { store } from "@/lib/blobs";
import { dayStatsSchema, mergeDay, statsKey, type DayStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, like GET /api/content: the player has no credentials. Worst case a
// stranger inflates the numbers of one day; they cannot touch content.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    // sendBeacon posts text/plain, fetch posts application/json: read both as text.
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }
  const parsed = dayStatsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  const day = parsed.data;

  // Only today ± a day or two (TV clock vs UTC, plus a late flush after midnight).
  const now = Date.now();
  const lo = new Date(now - 2 * 86400e3).toISOString().slice(0, 10);
  const hi = new Date(now + 86400e3).toISOString().slice(0, 10);
  if (day.date < lo || day.date > hi)
    return NextResponse.json({ error: "Dată în afara intervalului" }, { status: 400 });

  const kv = store("stats");
  const key = statsKey(day.date, day.screen);
  const prev = dayStatsSchema.safeParse(await kv.getJSON(key));
  await kv.setJSON(key, mergeDay(prev.success ? (prev.data as DayStats) : null, day));
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
}
