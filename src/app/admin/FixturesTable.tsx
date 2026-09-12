"use client";
import type { Fixture } from "@/lib/content";
import { blankFixture, sortFixtures } from "@/lib/content";

function isOld(f: Fixture, now = Date.now()): boolean {
  const t = new Date(f.kick).getTime();
  return Number.isFinite(t) && t < now - 24 * 3600 * 1000;
}

export default function FixturesTable({ fixtures, onChange }: { fixtures: Fixture[]; onChange: (f: Fixture[]) => void }) {
  const old = fixtures.filter((f) => isOld(f)).length;
  const upd = (id: string, patch: Partial<Fixture>) => onChange(fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button className="btn primary" onClick={() => onChange(sortFixtures([...fixtures, blankFixture()]))}>
          + Meci
        </button>
        {old > 0 && (
          <button className="btn danger" onClick={() => onChange(fixtures.filter((f) => !isOld(f)))}>
            Șterge meciurile vechi ({old})
          </button>
        )}
      </div>
      {!fixtures.length && <div className="empty">Niciun meci. Coloana din dreapta a TV-ului va fi goală.</div>}
      <div className="list">
        {fixtures.map((f) => (
          <div className={"fxcard" + (isOld(f) ? " past" : "")} key={f.id}>
            <div className="teams">
              <input value={f.home} placeholder="Gazde" onChange={(e) => upd(f.id, { home: e.target.value })} />
              <span className="vs">vs</span>
              <input value={f.away} placeholder="Oaspeți" onChange={(e) => upd(f.id, { away: e.target.value })} />
            </div>
            <div className="meta">
              <input value={f.comp} placeholder="Competiție (ex. Champions League)" onChange={(e) => upd(f.id, { comp: e.target.value })} />
              <input
                type="datetime-local"
                value={f.kick}
                onChange={(e) => upd(f.id, { kick: e.target.value })}
                onBlur={() => onChange(sortFixtures(fixtures))}
              />
            </div>
            <div className="row-actions" style={{ marginTop: 0 }}>
              <button className="btn sm ghost danger" onClick={() => onChange(fixtures.filter((x) => x.id !== f.id))}>
                Șterge
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
