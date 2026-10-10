"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Slide } from "@/lib/content";
import { daysBetween, fmtDuration, type DayStats } from "@/lib/stats";

type Range = "azi" | "ieri" | "7" | "30";
const RANGES: { id: Range; label: string }[] = [
  { id: "azi", label: "Azi" },
  { id: "ieri", label: "Ieri" },
  { id: "7", label: "7 zile" },
  { id: "30", label: "30 zile" },
];

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function rangeDates(r: Range): [string, string] {
  const now = new Date();
  const back = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return ymd(d);
  };
  if (r === "azi") return [ymd(now), ymd(now)];
  if (r === "ieri") return [back(1), back(1)];
  return [back(Number(r) - 1), ymd(now)];
}
const RO_D = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${RO_D[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function slideLabel(s: Slide | undefined, idx: number) {
  if (!s) return "(poster șters)";
  const t = [s.kicker, s.title].filter(Boolean).join(" · ");
  if (t) return t;
  return s.type === "image" ? `Poster imagine #${idx + 1}` : `Poster text #${idx + 1}`;
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function ReportView({ slides }: { slides: Slide[] }) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("7");
  const [data, setData] = useState<DayStats[] | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [from, to] = rangeDates(range);

  useEffect(() => {
    let off = false;
    setData(null);
    setErr("");
    fetch(`/api/stats?from=${from}&to=${to}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return router.refresh();
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Eroare");
        if (!off) setData(j.days as DayStats[]);
      })
      .catch(() => !off && setErr("Nu am putut încărca raportul."));
    return () => {
      off = true;
    };
  }, [from, to, router]);

  const r = useMemo(() => {
    if (!data) return null;
    const days = daysBetween(from, to);
    const screens = [...new Set(data.map((d) => d.screen))].sort();
    const byKey = new Map(data.map((d) => [`${d.date}|${d.screen}`, d]));
    const perScreen = screens.map((sc) => {
      const rows = data.filter((d) => d.screen === sc);
      const on = rows.reduce((a, d) => a + d.on, 0);
      return { screen: sc, on, active: rows.filter((d) => d.on > 0).length };
    });
    // average seconds per clock hour, over the days in range
    const hours = Array.from({ length: 24 }, (_, h) => data.reduce((a, d) => a + d.hours[h], 0));
    const hourAvg = hours.map((s) => s / Math.max(1, days.length * Math.max(1, screens.length)));
    const agg = new Map<string, { s: number; n: number }>();
    for (const d of data)
      for (const [id, v] of Object.entries(d.slides)) {
        const o = agg.get(id) ?? { s: 0, n: 0 };
        agg.set(id, { s: o.s + v.s, n: o.n + v.n });
      }
    const totalSlide = [...agg.values()].reduce((a, v) => a + v.s, 0);
    const posters = [...agg.entries()]
      .map(([id, v]) => {
        const i = slides.findIndex((s) => s.id === id);
        return {
          id,
          ...v,
          slide: slides[i],
          label: id === "seed" ? "Ecran implicit (fără postere)" : slideLabel(slides[i], i),
        };
      })
      .filter((p) => p.s > 0)
      .sort((a, b) => b.s - a.s);
    const totalOn = perScreen.reduce((a, s) => a + s.on, 0);
    return {
      days,
      screens,
      byKey,
      perScreen,
      hourAvg,
      posters,
      totalSlide,
      totalOn,
    };
  }, [data, from, to, slides]);

  function reportText() {
    if (!r) return "";
    const lines = [`Taproom TV — raport ${from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`}`, ""];
    for (const s of r.perScreen)
      lines.push(`Ecran ${s.screen}: ${fmtDuration(s.on)} în total, ${s.active}/${r.days.length} zile pornit`);
    lines.push("", "Pe zile:");
    for (const day of r.days)
      for (const sc of r.screens) {
        const d = r.byKey.get(`${day}|${sc}`);
        lines.push(
          `${dayLabel(day)} ${sc}: ${d ? `${fmtDuration(d.on)} (${d.first}–${d.last})` : "oprit / fără date"}`,
        );
      }
    lines.push("", "Postere (timp pe ecran · afișări · % din timp):");
    for (const p of r.posters) lines.push(`${p.label}: ${fmtDuration(p.s)} · ${p.n}× · ${pct(p.s, r.totalSlide)}%`);
    return lines.join("\n");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the CSV still works */
    }
  }
  function csv() {
    if (!r) return;
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["tip", "data", "ecran", "poster", "minute", "afisari", "prima_ora", "ultima_ora"].join(",")];
    for (const d of data ?? []) {
      rows.push(["zi", d.date, d.screen, "", Math.round(d.on / 60), "", d.first, d.last].map(q).join(","));
      for (const [id, v] of Object.entries(d.slides)) {
        const i = slides.findIndex((s) => s.id === id);
        rows.push(
          ["poster", d.date, d.screen, slideLabel(slides[i], i), Math.round(v.s / 60), v.n, "", ""].map(q).join(","),
        );
      }
    }
    const blob = new Blob(["﻿" + rows.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taproom-tv-raport-${from}_${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const maxHour = r ? Math.max(1, ...r.hourAvg) : 1;

  return (
    <div className="report">
      <div className="seg">
        {RANGES.map((x) => (
          <button key={x.id} className={range === x.id ? "on" : ""} onClick={() => setRange(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      {err && <div className="err">{err}</div>}
      {!r && !err && <div className="empty">Se încarcă…</div>}
      {r && r.screens.length === 0 && (
        <div className="empty">
          Nicio dată în acest interval. Ecranele trimit timpul la fiecare 5 minute, începând de la versiunea care are
          raportul — zilele de dinainte nu au fost înregistrate.
        </div>
      )}

      {r && r.screens.length > 0 && (
        <>
          <div className="cards">
            {r.perScreen.map((s) => (
              <div className="card" key={s.screen}>
                <div className="k">Ecran {s.screen}</div>
                <div className="v">{fmtDuration(s.on)}</div>
                <div className="hint">
                  {s.active}/{r.days.length} zile pornit · medie {fmtDuration(s.on / Math.max(1, s.active))}/zi
                </div>
              </div>
            ))}
          </div>

          <h3 className="sec">Când a fost pornit (medie pe oră)</h3>
          <div className="hours">
            {r.hourAvg.map((v, h) => (
              <div key={h} className="hb" title={`${h}:00 — ${Math.round(v / 60)} min/oră`}>
                <i style={{ height: `${Math.round((v / maxHour) * 100)}%` }} className={v > 0 ? "" : "zero"} />
                {h % 3 === 0 && <span>{h}</span>}
              </div>
            ))}
          </div>
          <div className="hint">Înălțimea = câte minute a mers ecranul, în medie, în acea oră. Gol = oprit.</div>

          <h3 className="sec">Pe zile</h3>
          <table className="rep">
            <tbody>
              {r.days
                .slice()
                .reverse()
                .flatMap((day) =>
                  r.screens.map((sc) => {
                    const d = r.byKey.get(`${day}|${sc}`);
                    return (
                      <tr key={day + sc} className={d && d.on > 0 ? "" : "off"}>
                        <td>{dayLabel(day)}</td>
                        {r.screens.length > 1 && <td className="m">{sc}</td>}
                        <td className="n">{d ? fmtDuration(d.on) : "—"}</td>
                        <td className="m">{d ? `${d.first}–${d.last}` : "fără date"}</td>
                      </tr>
                    );
                  }),
                )}
            </tbody>
          </table>

          <h3 className="sec">Postere</h3>
          {r.posters.length === 0 && <div className="empty">Niciun poster afișat.</div>}
          {r.posters.map((p) => (
            <div className="prow" key={p.id}>
              {p.slide?.type === "image" && p.slide.img ? (
                <img src={p.slide.img} alt="" />
              ) : (
                <div className="ph">T</div>
              )}
              <div className="pl">
                <div className="t">{p.label}</div>
                <div className="bar">
                  <i style={{ width: `${pct(p.s, r.totalSlide)}%` }} />
                </div>
                <div className="hint">
                  {fmtDuration(p.s)} · {p.n} afișări · {pct(p.s, r.totalSlide)}% din timp
                </div>
              </div>
            </div>
          ))}

          <div className="row-actions" style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={copy}>
              {copied ? "Copiat ✓" : "Copiază raportul"}
            </button>
            <button className="btn" onClick={csv}>
              Descarcă CSV
            </button>
          </div>
          <p className="hint">
            „Pornit” = playerul a rulat pe acel calculator cu pagina vizibilă. Nu știe dacă televizorul în sine era
            aprins. Toate TV-urile legate prin matrice HDMI la același mini PC apar ca un singur ecran.
          </p>
        </>
      )}
    </div>
  );
}
