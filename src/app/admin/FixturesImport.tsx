"use client";
import { useMemo, useRef, useState } from "react";
import type { Fixture } from "@/lib/content";
import { IMPORT_EXAMPLE, parseFixtures } from "@/lib/fixtureImport";

export default function FixturesImport({ existing, onAdd }: { existing: Fixture[]; onAdd: (f: Fixture[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseFixtures(text, existing), [text, existing]);
  const good = parsed.filter((p) => p.ok && !p.duplicate);
  const dups = parsed.filter((p) => p.ok && p.duplicate).length;
  const bad = parsed.filter((p) => !p.ok);

  function fmt(kick: string) {
    const [d, t] = kick.split("T");
    const [y, m, day] = d.split("-");
    return `${Number(day)}.${m}.${y} ${t}`;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setText(await f.text());
  }

  function add() {
    onAdd(good.map((p) => (p.ok ? p.fixture : null)).filter((f): f is Fixture => !!f));
    setText("");
    setOpen(false);
  }

  if (!open)
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        Import în bloc
      </button>
    );

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <label className="f" style={{ marginTop: 0 }}>
        Lipește meciurile, unul pe linie
      </label>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={IMPORT_EXAMPLE}
        spellCheck={false}
        style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}
      />
      <div className="hint">
        Format: <code>zi.lună oră Gazde - Oaspeți | Competiție</code>. Merge și lipit direct din Excel sau Google Sheets
        (coloane: dată, oră, gazde, oaspeți, competiție). Fără an = cea mai apropiată dată.
      </div>
      <div className="row-actions">
        <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onFile} style={{ display: "none" }} />
        <button className="btn sm ghost" onClick={() => fileRef.current?.click()}>
          Alege fișier .csv / .txt
        </button>
        <button className="btn sm ghost" onClick={() => setText(IMPORT_EXAMPLE)}>
          Exemplu
        </button>
      </div>

      {parsed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="hint" style={{ marginBottom: 6 }}>
            {good.length} de adăugat{dups ? ` · ${dups} deja există, sărite` : ""}
            {bad.length ? ` · ${bad.length} linii cu erori` : ""}
          </div>
          <div className="list" style={{ gap: 6 }}>
            {parsed.map((p) =>
              p.ok ? (
                <div key={p.line} className="imp-row" style={{ opacity: p.duplicate ? 0.45 : 1 }}>
                  <span className="imp-when">{fmt(p.fixture.kick)}</span>
                  <span className="imp-teams">
                    {p.fixture.home} – {p.fixture.away}
                  </span>
                  <span className="imp-comp">{p.duplicate ? "există deja" : p.fixture.comp}</span>
                </div>
              ) : (
                <div key={p.line} className="imp-row err">
                  <span className="imp-when">linia {p.line}</span>
                  <span className="imp-teams">{p.raw.trim()}</span>
                  <span className="imp-comp">{p.error}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="row-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={add} disabled={!good.length}>
          Adaugă {good.length ? good.length + " " : ""}meciuri
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setText("");
            setOpen(false);
          }}
        >
          Anulează
        </button>
      </div>
    </div>
  );
}
