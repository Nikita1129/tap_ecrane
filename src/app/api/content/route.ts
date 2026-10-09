import { NextResponse, type NextRequest } from "next/server";
import { requestIsAuthed } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/blobs";
import { contentSchema } from "@/lib/content";
import { crestFor } from "@/lib/crests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public. Polled by every TV every 5 minutes.
export async function GET() {
  const content = await readContent();
  // Crest URLs are derived from team names at read time, never stored.
  const fixtures = content.fixtures.map((f) => ({ ...f, homeCrest: crestFor(f.home), awayCrest: crestFor(f.away) }));
  return NextResponse.json({ ...content, fixtures }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Authenticated. Replaces the whole document. One editor, no merging.
export async function POST(req: NextRequest) {
  if (!requestIsAuthed(req)) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `Date invalide: ${first.path.join(".")} – ${first.message}`, issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const saved = await writeContent(parsed.data);
  return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
}
