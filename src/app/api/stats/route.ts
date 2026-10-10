import { NextResponse, type NextRequest } from "next/server";
import { requestIsAuthed } from "@/lib/auth";
import { store } from "@/lib/blobs";
import { dayStatsSchema, daysBetween, type DayStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

// Authenticated. GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD → { days: DayStats[] }
export async function GET(req: NextRequest) {
  if (!requestIsAuthed(req)) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!dateRe.test(from) || !dateRe.test(to) || from > to)
    return NextResponse.json({ error: "Interval invalid" }, { status: 400 });

  const wanted = new Set(daysBetween(from, to));
  const kv = store("stats");
  // Keys start with the date; list by month so a 30-day range is 1-2 list calls.
  const months = [...new Set([...wanted].map((d) => d.slice(0, 7)))];
  const keys = (await Promise.all(months.map((m) => kv.list(m)))).flat().filter((k) => wanted.has(k.slice(0, 10)));

  const days: DayStats[] = [];
  await Promise.all(
    keys.map(async (k) => {
      const p = dayStatsSchema.safeParse(await kv.getJSON(k));
      if (p.success) days.push(p.data);
    }),
  );
  days.sort((a, b) => (a.date === b.date ? a.screen.localeCompare(b.screen) : a.date.localeCompare(b.date)));
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
