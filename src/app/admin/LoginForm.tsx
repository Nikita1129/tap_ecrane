"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setErr(j.error || "Nu a mers");
        return;
      }
      router.refresh();
    } catch {
      setErr("Fără conexiune");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>
        <span style={{ color: "var(--amber)" }}>Taproom</span> TV
      </h1>
      <p>Introdu parola ca să editezi ecranele.</p>
      <input
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Parola"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      {err && <div className="err">{err}</div>}
      <button className="btn primary block" style={{ marginTop: 14 }} disabled={busy || !pw}>
        {busy ? "..." : "Intră"}
      </button>
    </form>
  );
}
