import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public. 200 when storage works and every real screen reported in the last
// 20 minutes, 503 otherwise. Polled by the watchdog and by any uptime monitor.
export async function GET() {
  const h = await checkHealth();
  return NextResponse.json(h, { status: h.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
