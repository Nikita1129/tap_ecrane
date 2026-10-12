// Taproom TV watchdog. Netlify runs it every 10 minutes on its own.
// It calls /api/health on the live site; when something breaks (storage down,
// a TV silent for 20+ min) it sends one Telegram message, and one more when it
// is fixed. No message while things stay the same, so no spam.
//
// Setup (Netlify -> Site configuration -> Environment variables):
//   TELEGRAM_BOT_TOKEN  token from @BotFather
//   TELEGRAM_CHAT_ID    optional; if missing, the chat that last wrote to the
//                       bot is used (send it any message, or /start in a group)
import { getStore } from "@netlify/blobs";

const STATE_KEY = "watchdog.json";

async function tg(token, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return r.json();
}

async function chatId(token, state) {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  if (state.chatId) return state.chatId;
  const u = await tg(token, "getUpdates", { limit: 100 });
  const last = (u.result || []).map((x) => (x.message || x.my_chat_member || x.channel_post || {}).chat).filter(Boolean).pop();
  return last ? String(last.id) : null;
}

export default async () => {
  const site = process.env.URL || "https://taproom-tv.netlify.app";
  let health;
  try {
    const r = await fetch(`${site}/api/health`, { headers: { "Cache-Control": "no-store" } });
    health = await r.json().catch(() => ({ ok: false, problems: [`/api/health a răspuns HTTP ${r.status}`] }));
    if (!r.ok && health.ok) health.ok = false;
  } catch (e) {
    health = { ok: false, problems: [`Site-ul nu răspunde: ${e.message}`] };
  }

  const kv = getStore({ name: "stats", consistency: "strong" });
  const state = (await kv.get(STATE_KEY, { type: "json" }).catch(() => null)) || {};
  const wasOk = state.ok !== false;
  const next = { ...state, ok: !!health.ok, lastRun: new Date().toISOString(), problems: health.problems || [] };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token && wasOk !== !!health.ok) {
    try {
      const id = await chatId(token, state);
      if (id) {
        next.chatId = id;
        const text = health.ok
          ? "✅ Taproom TV: totul merge din nou."
          : "⚠️ Taproom TV are o problemă:\n• " + (health.problems || ["necunoscută"]).join("\n• ") +
            "\n\nEcranele afișează în continuare ultimul conținut salvat.";
        const res = await tg(token, "sendMessage", { chat_id: id, text });
        next.lastAlert = { at: next.lastRun, ok: !!res.ok, error: res.ok ? undefined : res.description };
      } else {
        next.lastAlert = { at: next.lastRun, ok: false, error: "Nu știu unde să trimit: scrie-i botului un mesaj" };
      }
    } catch (e) {
      next.lastAlert = { at: next.lastRun, ok: false, error: e.message };
    }
    // Not delivered: keep the old state so the next run tries again.
    if (!next.lastAlert.ok) next.ok = wasOk;
  }
  await kv.setJSON(STATE_KEY, next);
  return new Response(null, { status: 204 });
};

export const config = { schedule: "*/10 * * * *" };
