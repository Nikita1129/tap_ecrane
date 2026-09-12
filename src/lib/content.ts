import { z } from "zod";

// ---------------------------------------------------------------------------
// Content shape. This is the single contract between admin, API and player.
// Rotation order = array order. Dates are inclusive local dates (TV clock).
// `kick` is local wall time without timezone, exactly what datetime-local gives.
// ---------------------------------------------------------------------------

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie să fie AAAA-LL-ZZ");
const hoursStr = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/, "Orele trebuie să fie HH:MM-HH:MM");

export const slideSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["image", "text"]),
  active: z.boolean(),
  img: z.string().default(""),
  kicker: z.string().default(""),
  title: z.string().default(""),
  sub: z.string().default(""),
  pills: z.array(z.string()).default([]),
  hot: z.boolean().default(false),
  from: z.union([dateStr, z.literal("")]).default(""),
  to: z.union([dateStr, z.literal("")]).default(""),
  hours: z.union([hoursStr, z.literal("")]).default(""),
  days: z.array(z.number().int().min(1).max(7)).default([]),
  prio: z.number().int().min(1).max(5).default(3),
  secs: z.number().int().min(3).max(120).default(12),
});

export const fixtureSchema = z.object({
  id: z.string().min(1),
  home: z.string().default(""),
  away: z.string().default(""),
  comp: z.string().default(""),
  kick: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ora meciului lipsește"),
});

export const contentSchema = z.object({
  version: z.literal(1).default(1),
  updatedAt: z.string().default(""),
  slides: z.array(slideSchema).max(200),
  fixtures: z.array(fixtureSchema).max(500),
});

export type Slide = z.infer<typeof slideSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Content = z.infer<typeof contentSchema>;

export function newId(prefix: "s" | "f"): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(8))
      : Array.from({ length: 8 }, () => Math.floor(Math.random() * 256));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}_${out}`;
}

export function blankSlide(type: Slide["type"] = "text"): Slide {
  return {
    id: newId("s"),
    type,
    active: true,
    img: "",
    kicker: "",
    title: "",
    sub: "",
    pills: [],
    hot: false,
    from: "",
    to: "",
    hours: "",
    days: [],
    prio: 3,
    secs: 12,
  };
}

export function blankFixture(): Fixture {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  return { id: newId("f"), home: "", away: "", comp: "", kick: toLocalInput(d) };
}

export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Seed used only while the content blob is empty. Replace with the FALLBACK /
// FIXTURES arrays from the original player once that file is in the repo.
export const SEED_CONTENT: Content = {
  version: 1,
  updatedAt: "",
  slides: [
    {
      ...blankSlide("text"),
      id: "s_seed_welcome",
      kicker: "Taproom by Litra & Friends",
      title: "Bere artizanală. BBQ. Fotbal.",
      sub: "Întreabă barmanul ce e nou la robinet.",
      pills: ["Centru", "Buiucani"],
      hot: false,
      prio: 3,
      secs: 12,
    },
    {
      ...blankSlide("text"),
      id: "s_seed_happy",
      kicker: "Happy hour",
      title: "-20% la toate berile de la robinet",
      sub: "În fiecare zi, 12:00–17:00",
      pills: ["12:00–17:00", "L–V"],
      hot: true,
      hours: "12:00-17:00",
      days: [1, 2, 3, 4, 5],
      prio: 4,
      secs: 10,
    },
  ],
  fixtures: [],
};

export function sortFixtures(list: Fixture[]): Fixture[] {
  return [...list].sort((a, b) => (a.kick < b.kick ? -1 : a.kick > b.kick ? 1 : 0));
}
