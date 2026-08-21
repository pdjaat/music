# Music API research and integration

## Comparison (2026)

| API | Free streaming | Search | Metadata/art | Auth | CORS | License |
| --- | --- | --- | --- | --- | --- | --- |
| **Audius** | Yes (artist-uploaded MP3) | Tracks, users, playlists | Yes | Optional app_name / API key for higher limits | Mixed; proxy used | Artists grant streaming via Audius |
| **Jamendo** | Yes (CC catalog) | Tracks/albums/artists | Yes | Client ID (OAuth for user data) | Often no; proxy used | CC; non-commercial API ~35k req/mo |
| **Internet Archive** | Yes (public items) | Advanced search | Item images | None for public metadata | Mixed; proxy used | Per-item (PD / CC / live-music policies) |
| Spotify Web API | **No full-track streaming** | Excellent | Excellent | OAuth | Yes | Not a legal full-stream source for this app |
| Apple / YT Music | No public full-stream API | — | — | — | — | Not used |

**Selected:** Audius (primary live catalog) + Jamendo (CC) + Archive (public-domain fallback).

Jamendo client ID is a public application identifier (`VITE_JAMENDO_CLIENT_ID`). Do not put OAuth secrets in the client.

## Why not Spotify/YouTube

Those APIs do not grant third-party apps the right to stream the commercial catalog without a license. This app never scrapes or proxies those services.

## Limitations

- Catalog is independent / CC / public domain — not Billboard hits.
- Archive item filenames are inconsistent; some identifiers will 404.
- Audius gated/premium tracks cannot play without wallet auth.
- Without outbound HTTPS from the host, the UI falls back to a small public-domain list.
