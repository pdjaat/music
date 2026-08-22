# Music providers — research & decisions

This document records the legal research behind the provider layer and why each
provider is used the way it is. Sangeet never scrapes, rips or circumvents any
platform, and never downloads/redistributes audio.

## Constraints found (verified 2026-08)

| Source | Legal for our use? | What it gives us |
|---|---|---|
| **YouTube Data API v3** | ✅ Official API, free tier 10,000 units/day (search = 100 units, `videos.list` = 1 unit). Embedding via the official IFrame player is the documented playback path. We never bypass ads/DRM and link back to every video. | Full-length playback + the best Indian catalog (Bollywood, Punjabi, regional). Requires `YOUTUBE_API_KEY`. |
| **YouTube IFrame Player API** | ✅ Official embed; no key needed for playback of a known video id. | Playback engine adapter. |
| **Deezer public API** | ✅ Developer terms allow free non-commercial use; audio via API is **30-second previews only**; attribution required; ~50 req/5s. Full-length requires paid subscriber scope which we do not use. | Metadata + preview streams (browser fallback), strong Indian catalog. |
| **iTunes Search API** | ✅ Apple's public search API (CORS-enabled, keyless); returns 30s preview URLs for use in apps. | Metadata + preview streams (secondary browser fallback). |
| **Internet Archive** | ✅ Open API (`advancedsearch.php` + `metadata` + `download`), keyless; items are public-domain/CC/rights-holder-uploaded audio. Reasonable-use rate limits — we cache 24h and cap fan-out. | Full-length legal streams; some Indian classics/folk; used as the keyless server fallback and in the browser fallback. |
| **MusicBrainz** | ✅ Open metadata (CC0), 1 req/s limit, requires User-Agent. | Search normalization, artist metadata; **no audio**. |
| JioSaavn/Gaana/Wynk/Spotify/Apple Music scrapers or unofficial APIs | ❌ Not used — violates ToS / copyright / DRM expectations. | — |

## Architecture

`MusicProvider` interface: `search`, `getTrending`, `getNewReleases`,
`getArtist`, `getAlbum`, `getPlaylist`, `getRadioTracks`, `resolveStream`,
`getLyrics`, `health`. Implementations:

- `server/src/providers/youtube.ts` — primary (requires key).
- `server/src/providers/internetArchive.ts` — keyless fallback.
- `server/src/providers/musicbrainz.ts` — metadata only.
- `web/src/providers/browserProviders.ts` — client-side adapters (Deezer via
  documented JSONP output, iTunes via CORS fetch, Internet Archive, MusicBrainz)
  used **only when the server cannot reach its own providers** (e.g. no key /
  no server egress). The UI shows a "Preview streams" badge in that mode.

Provider enable/disable and priority are stored in the `providers` table and
manageable from the admin panel (`/admin`).

## Previews vs full tracks

- Every track carries `stream.isPreview`; the UI labels previews ("preview",
  "30s") on cards, rows, the player and the full-screen player.
- Full-length playback is only used where the provider legally permits it:
  YouTube (official embed) and Internet Archive (PD/CC items).
- If a track is metadata-only (MusicBrainz), playback is disabled with a clear
  explanation instead of a fake stream.

## Attribution

Required attribution is shown on each track (`attribution` field) and the app
links back to the source page on the provider. The in-app page
`/providers` summarises all of this for end users.
