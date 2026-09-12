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
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Formular invalid" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Lipsește fișierul" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fișier peste 15 MB" }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    out = await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation from phone cameras
      .resize(TV_W, TV_H, { fit: "cover", position: "centre" })
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
