"use client";
import { useRef, useState } from "react";
import type { Slide } from "@/lib/content";
import PosterPreview from "./PosterPreview";

const DAY_LABELS = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const MAX_UPLOAD = 15 * 1024 * 1024;
const CLIENT_MAX_SIDE = 2800; // pre-shrink on the phone: Netlify functions reject bodies > 6 MB

export default function PosterEditor({
  slide,
  onChange,
  onClose,
}: {
  slide: Slide;
  onChange: (s: Slide) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Slide>(k: K, v: Slide[K]) => onChange({ ...slide, [k]: v });
  const [pillDraft, setPillDraft] = useState("");
  const [upl, setUpl] = useState<{ busy: boolean; msg: string; err: boolean }>({ busy: false, msg: "", err: false });
  const fileRef = useRef<HTMLInputElement>(null);

  function addPill() {
    const t = pillDraft.trim();
    if (!t) return;
    set("pills", [...slide.pills, t]);
    setPillDraft("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_UPLOAD) {
      setUpl({ busy: false, msg: "Fișierul are peste 15 MB. Alege altă poză.", err: true });
      return;
    }
    setUpl({ busy: true, msg: "Se pregătește poza…", err: false });
    try {
      const blob = await shrink(f);
      setUpl({ busy: true, msg: "Se încarcă…", err: false });
      const fd = new FormData();
      fd.append("file", blob, "upload.jpg");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = (await r.json()) as { img?: string; error?: string };
      if (!r.ok || !j.img) throw new Error(j.error || `HTTP ${r.status}`);
      set("img", j.img);
      setUpl({ busy: false, msg: "Imagine încărcată.", err: false });
    } catch (err) {
      setUpl({ busy: false, msg: (err as Error).message || "Încărcarea a eșuat", err: true });
    }
  }

  return (
    <div className="editor">
      <header className="top">
        <button className="btn sm ghost" onClick={onClose}>
          ← Înapoi
        </button>
        <h1>{slide.type === "image" ? "Poster imagine" : "Poster text"}</h1>
        <button className="btn sm primary" onClick={onClose}>
          Gata
        </button>
      </header>

      <div className="wrap">
        <div style={{ marginTop: 12 }}>
          <PosterPreview slide={slide} />
        </div>

        <label className="f">Tip</label>
        <div className="seg">
          <button className={slide.type === "image" ? "on" : ""} onClick={() => set("type", "image")}>
            Imagine
          </button>
          <button className={slide.type === "text" ? "on" : ""} onClick={() => set("type", "text")}>
            Text
          </button>
        </div>

        {slide.type === "image" && (
          <>
            <label className="f">Imagine</label>
            <div className="upload">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/*" onChange={onFile} />
              <button className="btn block" onClick={() => fileRef.current?.click()} disabled={upl.busy}>
                {upl.busy ? upl.msg : slide.img ? "Schimbă poza" : "Alege o poză"}
              </button>
              <div className={"hint" + (upl.err ? " err" : "")} style={{ marginTop: 8 }}>
                {upl.busy ? "" : upl.msg || "JPG, PNG sau HEIC, max 15 MB. Se decupează automat la 1400×960."}
              </div>
            </div>
          </>
        )}

        {slide.type === "text" && (
          <>
            <label className="f">Kicker (rând mic, sus)</label>
            <input value={slide.kicker} onChange={(e) => set("kicker", e.target.value)} placeholder="ex. Happy hour" />
            <label className="f">Titlu</label>
            <textarea rows={2} value={slide.title} onChange={(e) => set("title", e.target.value)} placeholder="Mesajul mare" />
            <label className="f">Subtitlu</label>
            <input value={slide.sub} onChange={(e) => set("sub", e.target.value)} placeholder="Detaliu, o propoziție" />
            <label className="f">Etichete (pills)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={pillDraft}
                onChange={(e) => setPillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPill();
                  }
                }}
                placeholder="ex. 12:00–17:00"
                enterKeyHint="done"
              />
              <button className="btn" onClick={addPill} disabled={!pillDraft.trim()}>
                +
              </button>
            </div>
            <div className="pills-in">
              {slide.pills.map((p, i) => (
                <span className="chip" key={i}>
                  {p}
                  <button onClick={() => set("pills", slide.pills.filter((_, j) => j !== i))} aria-label="Șterge">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="check">
              <span>
                Hot <span className="hint">(accent roșu în loc de chihlimbar)</span>
              </span>
              <button className={"sw" + (slide.hot ? " on" : "")} onClick={() => set("hot", !slide.hot)} aria-label="Hot" />
            </div>
          </>
        )}

        <label className="f">Perioadă (opțional)</label>
        <div className="grid2">
          <div>
            <input type="date" value={slide.from} onChange={(e) => set("from", e.target.value)} />
            <div className="hint">de la</div>
          </div>
          <div>
            <input type="date" value={slide.to} onChange={(e) => set("to", e.target.value)} />
            <div className="hint">până la (inclusiv)</div>
          </div>
        </div>

        <label className="f">Interval orar (opțional)</label>
        <HoursInput value={slide.hours} onChange={(v) => set("hours", v)} />

        <label className="f">Zile (opțional, gol = toate)</label>
        <div className="days">
          {DAY_LABELS.map((d, i) => {
            const n = i + 1;
            const on = slide.days.includes(n);
            return (
              <button
                key={n}
                className={on ? "on" : ""}
                onClick={() => set("days", on ? slide.days.filter((x) => x !== n) : [...slide.days, n].sort())}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className="grid2">
          <div>
            <label className="f">Prioritate (frecvență)</label>
            <div className="seg">
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} className={slide.prio === p ? "on" : ""} onClick={() => set("prio", p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="hint">5 = apare de 5 ori mai des decât 1</div>
          </div>
          <div>
            <label className="f">Secunde pe ecran</label>
            <input
              type="number"
              inputMode="numeric"
              min={3}
              max={120}
              value={slide.secs}
              onChange={(e) => set("secs", Math.max(3, Math.min(120, Number(e.target.value) || 3)))}
            />
          </div>
        </div>

        <div className="check" style={{ marginTop: 10 }}>
          <span>Activ</span>
          <button className={"sw" + (slide.active ? " on" : "")} onClick={() => set("active", !slide.active)} aria-label="Activ" />
        </div>
      </div>
    </div>
  );
}

function HoursInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [a, b] = value ? value.split("-") : ["", ""];
  function upd(na: string, nb: string) {
    onChange(na && nb ? `${na}-${nb}` : "");
  }
  return (
    <div className="grid2">
      <div>
        <input type="time" value={a} onChange={(e) => upd(e.target.value, b)} />
        <div className="hint">de la</div>
      </div>
      <div>
        <input type="time" value={b} onChange={(e) => upd(a, e.target.value)} />
        <div className="hint">până la</div>
      </div>
    </div>
  );
}

/** Downscale on the phone so the upload stays well under Netlify's 6 MB function limit. */
async function shrink(file: File): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    // Browser can't decode it (HEIC on Android Chrome). Send as-is if small enough.
    if (file.size <= 5 * 1024 * 1024) return file;
    throw new Error("Telefonul nu poate citi acest format. Fă un screenshot sau salvează ca JPG.");
  }
  const long = Math.max(bmp.width, bmp.height);
  const k = long > CLIENT_MAX_SIDE ? CLIENT_MAX_SIDE / long : 1;
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  if (!blob) return file;
  return blob;
}
