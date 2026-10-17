# Taproom TV — context for Claude

Read this first, then `README.md` (setup, formats, how things work).
Talk to Nichita in Romanian. Be direct, verify on the live site after every deploy,
and say plainly what you could not check.

## What this is

Digital signage for **Taproom by Litra & Friends** (Chișinău, locations Centru and
Buiucani). A Windows mini PC in the bar runs Chrome in kiosk mode on `/tv` and feeds
5–10 TVs through an HDMI matrix (all TVs show the same picture = one "screen").
Staff (Nichita; Natalia is the bar admin) manage posters and the fixtures list
from `/admin` on their phones.

- Live: https://taproom-tv.netlify.app — `/tv`, `/admin`, `/api/health`
- Netlify site `taproom-tv`, id `285268ad-a70a-40ab-9341-287971b040b2`
- Repo `Nikita1129/tap_ecrane` (public — never commit secrets).
  **Production branch is `claude/new-session-olk1h9`**; every push deploys.
- Stack: Next.js 16 App Router + TypeScript on Netlify, Netlify Blobs (no DB),
  sharp for images, zod for the content schema. The player is one static file,
  `public/tv.html`, vanilla JS.

## Non-negotiables

- The player never goes blank: it keeps the last content in localStorage and
  falls back to a seed slide. No heavy JS in `tv.html`.
- Content is one JSON document, written whole and validated (`src/lib/content.ts`).
- Uploaded images are never deleted automatically.
- **Never cache the Netlify Blobs store** across requests (`src/lib/blobs.ts`):
  `getStore()` captures a short-lived token; a cached store fails hours later with
  "Token expired" (this took the admin down on 11–12 Oct).
- Schedule logic exists twice, in `src/lib/schedule.ts` and in `tv.html`. Change both.

## How things fit together

- `GET /api/content` (public) — content + crest URLs + `build` (commit id). The
  player polls it every 5 min and **reloads itself when `build` changes**, so
  deploys reach the TVs without touching the mini PC.
- `POST /api/ping` (public) — each player sends today's screen-time totals every
  5 min; one blob per screen per day in store `stats`, merged by max (re-sends
  never double-count). `?debug=1` is not counted. Admin tab **Raport** reads them.
- `GET /api/health` — 200 when storage works and every real screen (≥1 h today)
  reported within 20 min; 503 + `problems` otherwise.
- `netlify/functions/watchdog.mjs` — scheduled every 10 min, calls `/api/health`,
  sends one Telegram message on each state change if `TELEGRAM_BOT_TOKEN` is set.
- Posters: normal (1400×960, programme panel + band visible) or **Ecran complet**
  (1920×1080, panel hidden; the red kickoff band still appears 15 min before a match).
- Crests: files in `public/crests/` + `node scripts/crests.mjs`; aliases in
  `src/lib/crest-aliases.json`; rules in `src/lib/crests.ts` (GP/F1 → F1 logo;
  trivia/quiz/wings/karaoke/taproom/litra → Taproom logo).

## Checking your work

```bash
npm ci                         # fresh containers have no node_modules
npm run lint                   # tsc --noEmit
npm run build
ADMIN_PASSWORD=test npx next start -p 3111   # local; storage falls back to .data/
```

Screenshot the admin at 390 px wide and the TV at 1920×1080 (Playwright with the
preinstalled Chromium) before calling a UI change done. After pushing, wait for
the deploy (`build` in `/api/content` = your commit) and check `/api/health`.

Fresh containers may be cloned from an older commit: `git fetch` and rebase onto
`origin/claude/new-session-olk1h9` before pushing.

## Access a session needs

- Environment variable `NETLIFY_AUTH_TOKEN` (Netlify personal access token).
- Network allowlist: `api.netlify.com`, `netlify.com`, `taproom-tv.netlify.app`,
  `*.netlify.app`, plus package managers.
- Netlify env vars on the site: `ADMIN_PASSWORD` (stored as non-secret; the secret
  flag silently failed once), `NODE_VERSION=22`; optional `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_CHAT_ID`, `SESSION_SECRET`.

## In the bar

- Mini PC autostarts `TaproomTV.bat` (shell:startup): Chrome `--kiosk` with its
  own profile `C:\TaproomTV\chrome`. Daily restart 07:00 via Task Scheduler;
  sleep/screen-off disabled. Remote access via AnyDesk.
- On the TV: `-` / `+` / `0` adjust size for overscan; holding the logo 4 s
  (anywhere, on a full-screen poster) opens a close dialog on touch screens.
- `scripts/windows/uptime-report.ps1` rebuilds past PC on/off time from the
  Windows event log.

## Open items (as of 17 Oct 2026)

1. Telegram alerts not active: `TELEGRAM_BOT_TOKEN` is not set in Netlify yet.
   After it is set: redeploy, then `/api/health` → `watchdog.alerts` = `telegram`.
2. `TaproomTV.bat` still opens `/tv` without `?screen=centru`, so the bar screen
   reports as `tv-sw6w`. Use `?screen=buiucani` for the second location.
3. The Mexicana poster is still in the normal format; for full screen it must be
   re-uploaded with "Ecran complet" on (the editor warns about this).
4. No crests yet for Canelo Álvarez, Christian Mbilli, LASK, Como.
5. Ideas offered, not built: a Romanian "Stare" (status) tab in the admin; an
   external uptime monitor (UptimeRobot) on `/api/health`, since the watchdog
   cannot report Netlify itself being down; restyling the admin once the
   designer delivers admin frames (Figma file `y1Fbc7ga1osRbbjCDcxjqX`).
