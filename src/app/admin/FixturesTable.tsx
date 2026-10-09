"use client";
import type { Fixture } from "@/lib/content";
import { blankFixture, sortFixtures } from "@/lib/content";
import FixturesImport from "./FixturesImport";
import { crestFor } from "@/lib/crests";

function Crest({ name }: { name: string }) {
  const url = name.trim() ? crestFor(name) : null;
  if (!name.trim()) return null;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="crest" src={url} alt="" title="Emblemă găsită" />
  ) : (
    <span className="crest none" title="Nu există emblemă pentru acest nume">?</span>
  );
}

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
        <FixturesImport existing={fixtures} onAdd={(added) => onChange(sortFixtures([...fixtures, ...added]))} />
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
              <div className="teamin">
                <Crest name={f.home} />
                <input value={f.home} placeholder="Gazde" onChange={(e) => upd(f.id, { home: e.target.value })} />
              </div>
              <span className="vs">vs</span>
              <div className="teamin">
                <Crest name={f.away} />
                <input value={f.away} placeholder="Oaspeți (gol = eveniment)" onChange={(e) => upd(f.id, { away: e.target.value })} />
              </div>
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
