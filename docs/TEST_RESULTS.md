# Test results

Date: 2026-08-21

## Build
- `tsc -b` — pass
- `vite build` — pass (214 kB JS)

## Manual / self-check
- Routes: `/`, `/search`, `/library`, `/playlists`, `/favorites`, `/settings`, `/auth` defined; unknown → home.
- Auth: signup/login/logout + session in localStorage; passwords SHA-256, never stored plaintext.
- Player store is module-level `Audio` — survives React route changes.
- Search debounce 350ms; empty query does not hit APIs.
- Fallback catalog used when Audius/Jamendo/Archive HTTPS fails (observed SSL blocked in this sandbox).
- No Spotify/YouTube scraping or ad-block.

## Limitations observed
- Outbound TLS to `api.audius.co`, `api.jamendo.com`, `archive.org` failed in the sandbox (`SSL_ERROR_SYSCALL`). Playback of remote URLs depends on the user's network.
- Playlist “add song” from search uses queue + create playlist then library add (UI: create playlist, then add via heart/library). Direct “add to playlist” picker is not a modal; users create playlists and play from library.

## Responsive
- Sidebar `md+`, bottom nav mobile, player stack on small screens.
