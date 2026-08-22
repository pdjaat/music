# Database design & PostgreSQL migration

The schema lives in `server/src/db/index.ts` (applied at boot to Node's
built-in SQLite via `node:sqlite`) and is intentionally portable.

## Entities

- **users** — email (unique), bcrypt password hash, display name, admin flag,
  theme, timestamps.
- **reset_tokens** — hashed one-time password-reset tokens.
- **languages / genres** — seeded lookup tables (14 languages, 25 genres).
- **artists / albums / songs** — canonical catalog. `songs` is unique on
  `(normalized_title, normalized_artist)` so the same song from multiple
  providers never duplicates.
- **providers** — enable/disable, priority, per-provider config
  (refresh interval etc.) and health state.
- **provider_tracks** — maps `(provider_id, provider_track_id)` → canonical
  `song_id`, with the stream details (kind, url/videoId, preview flag,
  license, attribution, expiry).
- **playlists / playlist_songs** — user playlists with ordered positions.
- **liked_songs / recently_played / listening_history** — personalization and
  analytics inputs (history `user_id` is nullable so guest plays count in
  aggregate stats without fake users).
- **radio_stations / featured_playlists** — editorial content with seed
  queries used to build queues from the active provider.
- **provider_cache** — persisted API-response cache with TTLs (admin can clear
  it and can override per-provider refresh intervals).
- **admin_events / search_log** — provider errors, API errors, search trends.

## Dedup strategy

`upsertTrack()` (in `services/catalog.ts`) normalises title/artist through the
transliterator (`अरिजीत सिंह` ≡ `Arijit Singh`) and uses the resulting key for
the unique constraint. Provider stream rows are added independently, and the
player resolves the best available stream.

## Moving to PostgreSQL

1. Create the same DDL — the tables above are already in normal form and use
   only portable SQL types (INTEGER, TEXT, BOOLEAN-as-INTEGER, JSON-as-TEXT).
   SQLite `AUTOINCREMENT` → Postgres `SERIAL`/`IDENTITY`;
   `datetime('now')` defaults → `now()`.
2. Swap the tiny data layer in `server/src/db/index.ts` for a `pg`-backed
   implementation (prepared statements only — no dynamic SQL beyond the
   whitelisted column sets already used).
3. Configure `DATABASE_URL` and keep the same service functions — routes never
   touch SQL directly, so nothing else changes.
4. For multi-instance production, move `provider_cache` and the rate limiter
   (`middleware/rateLimit.ts`) to Redis.
