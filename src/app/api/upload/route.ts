import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { requestIsAuthed } from "@/lib/auth";
import { store } from "@/lib/blobs";

export const runtime = "nodejs";
export const maxDuration = 26;

const MAX_BYTES = 15 * 1024 * 1024;
export const TV_W = 1400;
export const TV_H = 960;

function keyFor(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rnd}.jpg`;
}

export async function POST(req: NextRequest) {
  if (!requestIsAuthed(req)) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  let file: File | null = null;
  let fit = "cover";
  let crop: { x: number; y: number; w: number; h: number } | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    if (form.get("fit") === "contain") fit = "contain";
    const c = form.get("crop");
    if (typeof c === "string") {
      const j = JSON.parse(c) as Record<string, unknown>;
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
      const cand = { x: n(j.x), y: n(j.y), w: n(j.w), h: n(j.h) };
      if (![cand.x, cand.y, cand.w, cand.h].some(Number.isNaN) && cand.w > 0 && cand.h > 0) crop = cand;
    }
  } catch {
    return NextResponse.json({ error: "Formular invalid" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Lipsește fișierul" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fișier peste 15 MB" }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    // "cover": fill 1400x960, crop the overflow (photos).
    // "contain": whole image visible, dark bands where it does not fit (designed posters).
    const contain = fit === "contain";
    // Apply EXIF orientation first so crop coordinates match what the phone showed.
    let img = sharp(input, { failOn: "none" }).rotate();
    if (crop && !contain) {
      const meta = await sharp(await img.toBuffer()).metadata();
      const W = meta.width ?? 0;
      const H = meta.height ?? 0;
      if (W && H) {
        const left = Math.min(W - 1, Math.max(0, Math.round(crop.x * W)));
        const top = Math.min(H - 1, Math.max(0, Math.round(crop.y * H)));
        const width = Math.max(1, Math.min(W - left, Math.round(crop.w * W)));
        const height = Math.max(1, Math.min(H - top, Math.round(crop.h * H)));
        img = sharp(await img.toBuffer()).extract({ left, top, width, height });
      }
    }
    out = await img
      .resize(TV_W, TV_H, contain
        ? { fit: "contain", background: { r: 11, g: 10, b: 9 } }
        : { fit: "cover", position: "centre" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.error("sharp failed", e);
    return NextResponse.json(
      { error: "Nu am putut citi imaginea. Folosește JPG sau PNG (HEIC este convertit de telefon)." },
      { status: 415 },
    );
  }

  const key = keyFor();
  await store("images").setBytes(key, out, "image/jpeg");
  return NextResponse.json({ img: `/api/img/${key}`, bytes: out.length });
}
