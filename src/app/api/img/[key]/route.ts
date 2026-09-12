import { NextResponse } from "next/server";
import { store } from "@/lib/blobs";

export const runtime = "nodejs";

// Public, immutable: keys are unique per upload and images are never rewritten,
// so browsers (and the TV boxes) may cache them for a year.
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(key)) return new NextResponse("bad key", { status: 400 });
  const hit = await store("images").getBytes(key);
  if (!hit) return new NextResponse("not found", { status: 404 });
  return new NextResponse(hit.data, {
    status: 200,
    headers: {
      "Content-Type": hit.contentType,
      "Content-Length": String(hit.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
