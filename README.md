# Lumen — independent music player

Premium web player for **legally streamable** independent catalogs (Audius, Jamendo Creative Commons, Internet Archive public-domain audio). Not affiliated with Spotify, Apple Music, YouTube, or Google.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL. Sign up (local SHA-256 accounts in `localStorage`). Optional: set `VITE_JAMENDO_CLIENT_ID`.

## Deploy

Build `npm run build` and host `dist/` on any static host. For production API access, put a reverse proxy in front of Audius/Jamendo/Archive (same paths as `vite.config.ts`) or call those HTTPS APIs directly if CORS allows.

Optional Supabase: apply `src/sql/schema.sql` and set `VITE_SUPABASE_*`. The shipped app uses local persistence with equivalent tables.

## Tests

See `docs/TEST_RESULTS.md`.

## Docs

- `docs/API.md` — API comparison and licensing
- `src/sql/schema.sql` — RLS schema
