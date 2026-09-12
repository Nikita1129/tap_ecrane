import { NextResponse, type NextRequest } from "next/server";
import { checkPassword, cookieOptions, issueToken } from "@/lib/auth";

export const runtime = "nodejs";

// Tiny in-memory brake against password guessing. Resets when the function
// instance recycles, which is fine: it only needs to make brute force slow.
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) {
    return NextResponse.json({ ok: false, error: "Prea multe încercări. Așteaptă un minut." }, { status: 429 });
  }
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    /* empty body */
  }
  let ok = false;
  try {
    ok = checkPassword(password);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
  if (!ok) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 });
    return NextResponse.json({ ok: false, error: "Parolă greșită" }, { status: 401 });
  }
  attempts.delete(ip);
  const t = issueToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...cookieOptions(t.maxAge), value: t.value });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...cookieOptions(0), value: "" });
  return res;
}
