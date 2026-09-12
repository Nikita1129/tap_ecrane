# Taproom TV

Admin dashboard + TV player for the screens at Taproom by Litra & Friends.

- `/tv` – the player (static HTML, no framework). One URL for every TV.
- `/admin` – phone-first dashboard, Romanian, password protected.
- `/api/content` – public JSON the TVs poll every 5 minutes.

Stack: Next.js (App Router, TypeScript) on Netlify, Netlify Blobs for the
content JSON and the uploaded images. No database.

## Environment variables (Netlify → Site configuration → Environment variables)

| Variable         | Required | What it does                                                                                  |
| ---------------- | -------- | --------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | yes      | The one shared password for `/admin`.                                                         |
| `SESSION_SECRET` | no       | Signs the 30-day login cookie. If empty it is derived from the password, so changing the password logs every phone out. |

Leave the "Secret" checkbox off when adding these: a variable stored as
secret was silently dropped on this team's plan and the admin then reports
"ADMIN_PASSWORD nu este setat". After changing a variable, trigger a new
deploy; functions only pick up variables at build time.

Netlify Blobs needs no configuration. The two stores (`content`, `images`) are
created on first write.

## Deploy

1. Push this repo to GitHub and connect it in Netlify (build command and publish
   directory are already in `netlify.toml`). On the free plan, link your GitHub
   account under Netlify → Team settings → Git contributors, otherwise every
   build fails with "unrecognized Git contributor".
2. Set `ADMIN_PASSWORD`.
3. Deploy. Open `https://<your-site>.netlify.app/admin` on your phone.

## Run locally

```bash
npm install
cp .env.example .env.local     # set ADMIN_PASSWORD
npm run dev                    # http://localhost:3000/admin
```

Without the Netlify CLI, storage falls back to files under `.data/` (ignored by
git). To test against real Netlify Blobs, use `npx netlify dev` after
`npx netlify link`.

## URL to open on each TV

```
https://<your-site>.netlify.app/tv
```

Open it in Chrome (Windows mini PC: `chrome --kiosk --autoplay-policy=no-user-gesture-required https://<your-site>.netlify.app/tv`)
or in the browser on the Android box, full screen. Same URL on every screen.

- `/tv?debug=1` shows an overlay with data source, last fetch, errors and the current slide.
- Remote / keyboard: `→` next poster, `←` previous, `Enter` pause / resume.

## How the player stays up

- Every successful `/api/content` response is cached in `localStorage`.
- On start it renders the cache first, then fetches. If the network is down it
  keeps rotating from the cache. If there is no cache at all, it shows a built-in
  seed poster. It never goes black.
- Images are preloaded and kept in memory, and served with a one-year immutable
  cache header, so a network drop during the day does not break the rotation.
  Only a reboot with no network could show a missing image on a poster that
  the browser cache has evicted.
- Slides outside their date / hours / weekday window are dropped from the cycle
  automatically, re-evaluated every minute on the TV's own clock.

## Content model

`/api/content` returns one document:

```json
{
  "version": 1,
  "updatedAt": "2026-09-12T10:00:00.000Z",
  "slides": [
    {
      "id": "s_k3f9x2", "type": "image", "active": true,
      "img": "/api/img/20260912-101500-k3f9x2.jpg",
      "kicker": "", "title": "", "sub": "", "pills": [], "hot": false,
      "from": "2026-09-19", "to": "2026-10-04", "hours": "12:00-17:00", "days": [1,2,3,4,5],
      "prio": 3, "secs": 12
    }
  ],
  "fixtures": [
    { "id": "f_a1b2c3", "home": "Real Madrid", "away": "Barcelona", "comp": "La Liga", "kick": "2026-09-20T22:00" }
  ]
}
```

- Array order is rotation order. `prio` is a weight: a poster with prio 5
  appears five times per cycle, prio 1 once.
- `from` / `to` are inclusive local dates. `kick` is local wall time.
- Saving replaces the whole document. There is one editor; no merging.
- Deleting a poster never deletes its image blob.

## Uploads

JPG / PNG / HEIC up to 15 MB. The phone downscales the photo before sending
(Netlify functions cap request bodies at 6 MB), then the server crops to
1400×960 (cover, centred), re-encodes as JPG quality 80 and stores it in Blobs.
HEIC is converted by iOS on the way out; Android Chrome cannot decode HEIC, so
on Android use JPG.

## The player file

`public/tv.html` is served at `/tv`. It is plain HTML and CSS; the design
(colours, fonts, sizes) is at the top of the file and can be edited without
touching anything else. Only the block after the `DATA LOADING` marker talks
to the backend. If you restyle the page, keep that block and the element ids
it uses (`#stage`, `#fxlist`, `#next`, `#band`, `#clock`, `#dbg`).
