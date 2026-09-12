"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Content, Slide } from "@/lib/content";
import { blankSlide, sortFixtures } from "@/lib/content";
import PosterList from "./PosterList";
import PosterEditor from "./PosterEditor";
import FixturesTable from "./FixturesTable";

type Tab = "postere" | "meciuri";

export default function Dashboard() {
  const router = useRouter();
  const [content, setContent] = useState<Content | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [tab, setTab] = useState<Tab>("postere");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((c: Content) => setContent({ ...c, fixtures: sortFixtures(c.fixtures) }))
      .catch(() => setLoadErr("Nu am putut încărca conținutul."));
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = useCallback((fn: (c: Content) => Content) => {
    setContent((c) => (c ? fn(c) : c));
    setDirty(true);
    setSaveMsg(null);
  }, []);

  async function save() {
    if (!content) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (r.status === 401) {
        router.refresh();
        return;
      }
      const j = (await r.json()) as Content & { error?: string };
      if (!r.ok) {
        setSaveMsg({ kind: "err", text: j.error || "Salvarea a eșuat" });
        return;
      }
      setContent({ ...j, fixtures: sortFixtures(j.fixtures) });
      setDirty(false);
      setSaveMsg({ kind: "ok", text: "Salvat. TV-urile preiau în max. 5 min." });
    } catch {
      setSaveMsg({ kind: "err", text: "Fără conexiune. Nimic nu s-a pierdut, încearcă din nou." });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (dirty && !confirm("Ai modificări nesalvate. Ieși oricum?")) return;
    await fetch("/api/auth", { method: "DELETE" });
    router.refresh();
  }

  function addSlide(type: Slide["type"]) {
    const s = blankSlide(type);
    update((c) => ({ ...c, slides: [...c.slides, s] }));
    setEditingId(s.id);
  }

  const editing = content?.slides.find((s) => s.id === editingId) ?? null;

  return (
    <>
      <header className="top">
        <h1>
          <span className="brand">Taproom</span> TV
        </h1>
        <a className="btn sm ghost" href="/tv?debug=1" target="_blank" rel="noreferrer">
          Vezi TV
        </a>
        <button className="btn sm ghost" onClick={logout}>
          Ieși
        </button>
      </header>

      <main className="wrap">
        {loadErr && <div className="err">{loadErr}</div>}
        {!content && !loadErr && <div className="empty">Se încarcă…</div>}
        {content && (
          <>
            <div className="tabs" role="tablist">
              <button className={tab === "postere" ? "on" : ""} onClick={() => setTab("postere")}>
                Postere ({content.slides.length})
              </button>
              <button className={tab === "meciuri" ? "on" : ""} onClick={() => setTab("meciuri")}>
                Meciuri ({content.fixtures.length})
              </button>
            </div>

            {tab === "postere" && (
              <>
                <div className="row-actions" style={{ marginBottom: 12 }}>
                  <button className="btn primary" onClick={() => addSlide("image")}>
                    + Poster imagine
                  </button>
                  <button className="btn" onClick={() => addSlide("text")}>
                    + Poster text
                  </button>
                </div>
                <PosterList
                  slides={content.slides}
                  onChange={(slides) => update((c) => ({ ...c, slides }))}
                  onEdit={setEditingId}
                />
              </>
            )}

            {tab === "meciuri" && (
              <FixturesTable fixtures={content.fixtures} onChange={(fixtures) => update((c) => ({ ...c, fixtures }))} />
            )}
          </>
        )}
      </main>

      {editing && (
        <PosterEditor
          slide={editing}
          onChange={(s) => update((c) => ({ ...c, slides: c.slides.map((x) => (x.id === s.id ? s : x)) }))}
          onClose={() => setEditingId(null)}
        />
      )}

      <div className="savebar">
        <div className={"st " + (saveMsg?.kind === "err" ? "err" : dirty ? "dirty" : "")}>
          {saveMsg ? saveMsg.text : dirty ? "Modificări nesalvate" : "Totul e salvat"}
        </div>
        <button className="btn primary" onClick={save} disabled={!dirty || saving || !content}>
          {saving ? "Se salvează…" : "Salvează"}
        </button>
      </div>
    </>
  );
}
