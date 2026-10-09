// Team name -> crest slug. Shared by the manifest builder, the API and the admin.
const NOISE = /\b(fc|cf|afc|sc|ac|as|ss|ssc|rc|cd|ud|sd|bk|fk|sk|nk|if|bsc|vfb|vfl|tsg|sv|1\.|club|de|futbol|football|calcio)\b/g;

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics: Barça -> Barca, Chișinău -> Chisinau
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(NOISE, " ")
    .trim()
    .replace(/\s+/g, "-");
}
