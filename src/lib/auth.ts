import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "tv_admin";
const THIRTY_DAYS = 30 * 24 * 3600;

function password(): string {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD nu este setat");
  return p;
}

function secret(): Buffer {
  const explicit = process.env.SESSION_SECRET;
  const base = explicit && explicit.length > 0 ? explicit : `derived:${password()}`;
  return createHash("sha256").update(base).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassword(candidate: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEq(h(candidate), h(password()));
}

/** Token = "<expiry unix seconds>.<hmac>" */
export function issueToken(): { value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + THIRTY_DAYS;
  const payload = `admin.${exp}`;
  return { value: `${exp}.${sign(payload)}`, maxAge: THIRTY_DAYS };
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  try {
    return safeEq(sig, sign(`admin.${exp}`));
  } catch {
    return false;
  }
}

/** For server components. */
export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE_NAME)?.value);
}

/** For route handlers. */
export function requestIsAuthed(req: NextRequest): boolean {
  return verifyToken(req.cookies.get(COOKIE_NAME)?.value);
}

export function cookieOptions(maxAge: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
