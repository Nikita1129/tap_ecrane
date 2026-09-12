import { getStore, type Store } from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { contentSchema, SEED_CONTENT, type Content } from "./content";

// Two stores: "content" holds one JSON document; "images" holds JPG bytes.
// Strong consistency so the player sees a save on its next poll, not a minute later.
//
// Outside Netlify (plain `next dev` without `netlify dev`) @netlify/blobs has no
// credentials, so we fall back to files under .data/. Same interface, same keys.

export const CONTENT_KEY = "content.json";

type Bytes = ArrayBuffer;

export interface KV {
  getJSON(key: string): Promise<unknown | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  getBytes(key: string): Promise<{ data: Bytes; contentType: string } | null>;
  setBytes(key: string, data: Buffer, contentType: string): Promise<void>;
}

function netlifyAvailable(): boolean {
  // Set by the Netlify runtime and by `netlify dev`.
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY_SITE_ID);
}

class NetlifyKV implements KV {
  private store: Store;
  constructor(name: string) {
    this.store = getStore({ name, consistency: "strong" });
  }
  async getJSON(key: string) {
    const v = await this.store.get(key, { type: "json" });
    return v ?? null;
  }
  async setJSON(key: string, value: unknown) {
    await this.store.setJSON(key, value);
  }
  async getBytes(key: string) {
    const res = await this.store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!res) return null;
    const ct = typeof res.metadata?.contentType === "string" ? res.metadata.contentType : "image/jpeg";
    return { data: res.data, contentType: ct };
  }
  async setBytes(key: string, data: Buffer, contentType: string) {
    await this.store.set(key, new Blob([new Uint8Array(data)]), { metadata: { contentType } });
  }
}

class FileKV implements KV {
  private dir: string;
  constructor(name: string) {
    this.dir = path.join(process.cwd(), ".data", name);
  }
  private p(key: string) {
    if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error("bad key");
    return path.join(this.dir, key);
  }
  async getJSON(key: string) {
    try {
      return JSON.parse(await fs.readFile(this.p(key), "utf8"));
    } catch {
      return null;
    }
  }
  async setJSON(key: string, value: unknown) {
    await fs.mkdir(this.dir, { recursive: true });
    const tmp = this.p(key) + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(value));
    await fs.rename(tmp, this.p(key)); // atomic on POSIX
  }
  async getBytes(key: string) {
    try {
      const buf = await fs.readFile(this.p(key));
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), contentType: "image/jpeg" };
    } catch {
      return null;
    }
  }
  async setBytes(key: string, data: Buffer) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.p(key), data);
  }
}

const cache = new Map<string, KV>();
export function store(name: "content" | "images"): KV {
  let kv = cache.get(name);
  if (!kv) {
    kv = netlifyAvailable() ? new NetlifyKV(name) : new FileKV(name);
    cache.set(name, kv);
  }
  return kv;
}

export async function readContent(): Promise<Content> {
  const raw = await store("content").getJSON(CONTENT_KEY);
  if (raw) {
    const parsed = contentSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    console.error("content.json invalid, serving seed:", parsed.error.issues);
  }
  return SEED_CONTENT;
}

export async function writeContent(content: Content): Promise<Content> {
  const stamped: Content = { ...content, version: 1, updatedAt: new Date().toISOString() };
  await store("content").setJSON(CONTENT_KEY, stamped);
  return stamped;
}
