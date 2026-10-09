// Builds src/lib/crests.json from the files in public/crests.
// Run after adding or renaming crest files:  node scripts/crests.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "crests");
const files = readdirSync(dir).filter((f) => /\.(png|svg|webp)$/i.test(f)).sort();

// Same rules as src/lib/slug.ts (kept in sync by hand; both are tiny).
const NOISE = /\b(fc|cf|afc|sc|ac|as|ss|ssc|rc|cd|ud|sd|bk|fk|sk|nk|if|bsc|vfb|vfl|tsg|sv|1\.|club|de|futbol|football|calcio)\b/g;
const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ").replace(NOISE, " ").trim().replace(/\s+/g, "-");

const manifest = {};
for (const f of files) {
  const base = f.replace(/\.(png|svg|webp)$/i, "");
  const slug = slugify(base.replace(/[-_]+/g, " "));
  if (manifest[slug] && manifest[slug] !== f) console.warn(`slug clash: ${slug} <- ${manifest[slug]} and ${f}`);
  manifest[slug] = f;
}
writeFileSync(join(process.cwd(), "src", "lib", "crests.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`${files.length} crests -> src/lib/crests.json`);
