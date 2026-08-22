# Sangeet (संगीत) — Indian Music Streaming

A production-ready **Indian music streaming & discovery web app**: search, radio,
playlists, likes, recommendations and a premium dark-mode UI — built entirely
on **legal, attributed music providers**.

> Primary music focus: Hindi, Punjabi, Haryanvi, Rajasthani, Bhojpuri, Marathi,
> Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese and more.

---

## Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router |
| Backend   | Node.js + Express + TypeScript |
| Database  | SQLite via Node's built-in `node:sqlite` (PostgreSQL-portable schema, see `docs/DATABASE.md`) |
| Auth      | JWT + bcrypt (register / login / guest / password reset) |
| PWA       | Installable web app (manifest + service worker via `vite-plugin-pwa`) |
| Providers | Abstraction layer — YouTube (primary), Internet Archive, MusicBrainz; browser fallbacks: Deezer & iTunes previews |

## Quick start

```bash
npm install

# 1) configure secrets (optional in dev)
cp .env.example server/.env

# 2) run API (http://localhost:4000) + web (http://localhost:5173)
npm run dev

# 3) production build + tests
npm run build
npm test
```

**Set `YOUTUBE_API_KEY`** in `server/.env` for full-length playback and
discovery of the Indian catalog through the official YouTube Data API + IFrame
player. Without a key the app stays fully functional in **preview mode**:
legal 30-second previews (Deezer/iTunes) and full public-domain/CC streams
(Internet Archive), clearly labelled.

**Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`** to bootstrap an
administrator account (admin panel at `/admin`).

## Legal & provider model

Sangeet is a **streaming client, not a content owner**. Every track is streamed
through the official, publicly documented API of the provider shown on the
track; audio is never downloaded, re-encoded or redistributed, and ads/DRM/
subscription walls are never bypassed. See `docs/PROVIDERS.md` for the full
provider research and `src/pages/ProvidersPage.tsx` for the in-app
transparency page.

- **YouTube** — discovery via Data API v3; playback via the official IFrame
  player (full tracks; YouTube branding/ads intact; "Watch on YouTube" link on
  every track).
- **Internet Archive** — keyless, full-length public-domain/CC audio.
- **MusicBrainz** — open metadata for search normalization.
- **Deezer / iTunes (browser fallback)** — 30-second previews, labelled
  "preview" everywhere in the UI.
- **Attribution** — each track shows its provider, preview/full label and
  provider-required attribution, and links back to the source page.

## Feature map

- **Player**: play/pause, next/prev, seek, volume/mute, shuffle, repeat,
  queue with "up next", autoplay/continuation, mini-player bar, full-screen
  player with queue/lyrics/track-radio tabs, keyboard shortcuts
  (space, arrows, Ctrl/Cmd+K search).
- **Discovery**: new releases, trending, recommended-for-you (listening-based
  recommender), daily mixes, featured playlists, 14 languages, 25 genres,
  16 radio stations (auto-continuing), track radio.
- **Library** (sign-in required): liked songs, recently played, albums,
  artists, playlists (create/rename/reorder/delete/public-private/share).
- **Search**: debounced, transliteration-aware — `अरिजीत सिंह` finds
  "Arijit Singh", `ਏਪੀ ਢਿੱਲੋਂ` → "AP Dhillon" style tolerance.
- **Admin** (`/admin`): users/plays/artists stats, most-played songs &
  artists, popular languages/genres, provider health, enable/disable
  providers, cache control, search trends, event log, featured-playlist and
  radio management.
- **UX**: dark (default) + light themes, skeleton loaders, error boundaries,
  toasts, empty states, mobile bottom-nav + bottom player, PWA install.

## Environment variables

See `.env.example`. Secrets (API keys, `AUTH_SECRET`) are **server-side only**
— the web bundle never contains them.

## Deployment (Vercel + hosted API)

The repo ships with `vercel.json` so the **frontend deploys to Vercel out of the
box** (framework: Vite, output: `web/dist`, SPA rewrites). The Node/Express API
is a long-running server (SQLite file DB) and should be hosted on a platform
that supports it (Render, Railway, Fly.io, a VPS, or Docker) — it is not a
Vercel serverless function.

**Steps**

1. Push the repo to GitHub and import it into Vercel (root directory: repo root).
   `vercel.json` already sets the build command and output directory, and
   `.nvmrc`/`engines` pin Node 22.
2. Deploy the API separately:
   ```bash
   npm run build -w server     # produces server/dist
   npm run start -w server     # requires Node >= 22.5 (node:sqlite)
   ```
   with environment variables from `.env.example` (`AUTH_SECRET`,
   `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `YOUTUBE_API_KEY`, …).
3. Point the Vercel frontend at the API with a build-time environment variable:
   ```
   VITE_API_BASE=https://your-api-host.example.com
   ```
   (The API must allow the Vercel origin: set `CLIENT_ORIGIN` on the server.)
4. **No API yet?** The app still works: it auto-detects that `/api` is
   unreachable and switches to legal browser-side providers (Deezer/iTunes 30s
   previews + Internet Archive full CC audio), showing a "Preview streams"
   badge. Add `VITE_API_BASE` to enable the full experience.

## Testing

```bash
npm test                 # server (26 tests) + web (12 tests)
npm run typecheck        # strict TS on both packages
```

Coverage includes: auth flows, playlist CRUD + reorder + ownership,
ingest/dedup, likes/history, admin guards, rate limiting, transliteration
across 10 Indic scripts, and DOM smoke tests of every major page.

## Directory layout

```
server/src/
  providers/     # MusicProvider contract + youtube / internetArchive / musicbrainz
  services/      # catalog (dedup), cache, playlists, library, recommendations, radio, admin
  routes/        # REST API (auth, browse, library, admin, providers, health)
  db/            # schema + seed (languages, genres, radio stations, providers)
web/src/
  lib/           # types, api client, transliteration, unified catalog service
  providers/     # browser fallback providers (deezer jsonp, itunes, internet archive, musicbrainz)
  state/         # zustand stores + playback engine (audio + YouTube adapters)
  components/    # shell (sidebar/topbar/player) + shared UI
  pages/         # Home, Search, Radio, Library, Album, Artist, Playlist, Admin, …
```
