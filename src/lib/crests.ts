import manifest from "./crests.json";
import aliases from "./crest-aliases.json";
import { slugify } from "./slug";

const files = manifest as Record<string, string>;
const alias = aliases as Record<string, string>;

/** Public URL of the crest for a team name, or null when we have none. */
export function crestFor(name: string): string | null {
  const s = slugify(name);
  if (!s) return null;
  const candidates = [s, alias[s]].filter(Boolean) as string[];
  if (/(^|-)gp$|grand-prix|formula-1|^f1$/.test(s)) candidates.push("formula-1");
  for (const c of candidates) {
    if (files[c]) return `/crests/${files[c]}`;
  }
  // Loose match: manifest slug contained in the name or vice versa (e.g. "inter" vs "inter-milan").
  for (const key of Object.keys(files)) {
    if (key.length >= 4 && (s === key || s.startsWith(key + "-") || s.endsWith("-" + key))) return `/crests/${files[key]}`;
  }
  return null;
}

export const crestCount = Object.keys(files).length;
