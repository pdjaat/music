/**
 * Unified catalog service.
 *
 * Talks to the Sangeet API by default. When the server reports that its
 * upstream providers are unreachable (no YOUTUBE_API_KEY / no egress), it
 * transparently switches to legal browser-side providers (Deezer previews,
 * iTunes previews, Internet Archive full CC streams, MusicBrainz metadata).
 */

import { api } from './api';
import { browserProviders, primaryBrowserProvider, fallbackBrowserProvider, fullStreamBrowserProvider, BrowserProvider } from '../providers/browserProviders';
import { searchVariants } from './text';

const { deezer, itunes, internetarchive: internetArchive } = browserProviders;
import type {
  Album, Artist, FeaturedPlaylist, HomeData, Language, Genre, ProviderPlaylist,
  RadioStation, SearchResults, Track, ProviderHealthStatus,
} from './types';

export type Mode = 'server' | 'browser';

let mode: Mode | null = null;
let healthCheckedAt = 0;
const HEALTH_TTL = 2 * 60 * 1000;

export function getMode(): Mode {
  return mode ?? 'server';
}

function setMode(m: Mode): void {
  if (mode !== m) {
    mode = m;
    window.dispatchEvent(new CustomEvent('sangeet:mode-changed', { detail: { mode: m } }));
  } else {
    mode = m;
  }
}

export async function detectMode(force = false): Promise<Mode> {
  if (mode && !force && Date.now() - healthCheckedAt < HEALTH_TTL) return mode;
  try {
    const data = await api<{ providers: ProviderHealthStatus[] }>('/api/health/providers', { auth: false });
    const streamProviders = data.providers.filter((p) => p.provider !== 'musicbrainz');
    const anyReachable = streamProviders.some((p) => p.reachable);
    setMode(anyReachable ? 'server' : 'browser');
  } catch {
    setMode('browser');
  }
  healthCheckedAt = Date.now();
  return mode ?? 'browser';
}

export function isBrowserMode(): boolean {
  return mode === 'browser';
}

/** Persist a browser-provider track into the server catalog (upsert + id). */
export async function ingestTrack(track: Track): Promise<Track> {
  try {
    const res = await api<{ track: Track }>('/api/tracks/ingest', { method: 'POST', body: { track } });
    return res.track;
  } catch {
    return track; // guest / offline: keep client-side id
  }
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

/**
 * Fetch the server home payload. NEVER blocks on browser providers — the
 * page renders server content (languages, featured, radio…) immediately and
 * fills the trending/new-releases rails asynchronously via getBrowserRails().
 */
export async function getHome(): Promise<HomeData> {
  const m = await detectMode();
  try {
    const data = await api<HomeData>('/api/home');
    if (data.providersUnavailable && m === 'server') setMode('browser');
    return data;
  } catch {
    // API itself unreachable (offline) — return an empty shell; pages show retry.
    return {
      providersUnavailable: true, languages: [], genres: [], stations: [], featured: [],
      recentlyPlayed: [], continueListening: [], recommended: { tracks: [], reasons: [] }, mixes: [],
      newReleases: [], trending: [], providerInfo: null,
    };
  }
}

export interface BrowserRails {
  trending: Track[];
  newReleases: Track[];
}

/**
 * Fill the home rails from legal browser providers, trying each in order
 * until one yields tracks. Bounded by per-provider failures (each provider
 * has its own short timeout) so this can never hang the page.
 */
export async function getBrowserRails(): Promise<BrowserRails> {
  const order: BrowserProvider[] = [deezer, itunes, internetArchive];
  const rails: BrowserRails = { trending: [], newReleases: [] };
  for (const p of order) {
    if (rails.trending.length === 0) {
      try { rails.trending = await p.trending(16); } catch { /* try next */ }
    }
    if (rails.newReleases.length === 0) {
      try { rails.newReleases = await p.newReleases(16); } catch { /* try next */ }
    }
    if (rails.trending.length > 0 && rails.newReleases.length > 0) break;
  }
  return rails;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchAll(query: string, type: 'all' | 'song' | 'album' | 'artist' | 'playlist' = 'all', limit = 20): Promise<SearchResults> {
  const m = await detectMode();
  if (m === 'browser') {
    // Try Deezer → iTunes → Internet Archive until something returns results.
    const chain = [primaryBrowserProvider(), fallbackBrowserProvider(), fullStreamBrowserProvider()];
    let lastErr: unknown = null;
    for (const p of chain) {
      try {
        const results = await p.search(query, type, limit);
        const hasAny = results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0 || results.playlists.length > 0;
        if (hasAny) return results;
        lastErr = new Error('no results');
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('all browser providers failed');
  }
  try {
    const params = new URLSearchParams({ q: query, type, limit: String(limit) });
    return await api<SearchResults>(`/api/search?${params.toString()}`);
  } catch (e) {
    // Server catalog unavailable — browser fallback.
    return primaryBrowserProvider().search(query, type, limit);
  }
}

export async function searchSongs(query: string, limit = 20): Promise<Track[]> {
  return (await searchAll(query, 'song', limit)).tracks;
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

export async function getTrack(id: number): Promise<{ track: Track; related: Track[]; liked: boolean }> {
  return api(`/api/tracks/${id}`);
}

export async function getAlbum(provider: string, providerId: string): Promise<Album> {
  if (isBrowserMode()) {
    const p = provider === 'internetarchive' ? fullStreamBrowserProvider() : provider === 'itunes' ? fallbackBrowserProvider() : primaryBrowserProvider();
    return p.getAlbum(providerId);
  }
  return api(`/api/albums/${provider}/${providerId}`);
}

export async function getArtist(provider: string, providerId: string): Promise<Artist> {
  if (isBrowserMode()) {
    const p = provider === 'internetarchive' ? fullStreamBrowserProvider() : provider === 'itunes' ? fallbackBrowserProvider() : primaryBrowserProvider();
    const [artist, topTracks] = await Promise.all([
      p.getArtist(providerId).catch(() => ({ name: providerId.replace(/^(dz|it|ia|mb):/, ''), provider, providerArtistId: providerId })),
      p.getArtistTopTracks(providerId, 20).catch(() => []),
    ]);
    return { ...artist, topTracks };
  }
  return api(`/api/artists/${provider}/${providerId}`);
}

export async function getProviderPlaylist(provider: string, providerId: string): Promise<ProviderPlaylist> {
  if (isBrowserMode()) {
    const p = provider === 'internetarchive' ? fullStreamBrowserProvider() : primaryBrowserProvider();
    return p.getPlaylist(providerId);
  }
  return api(`/api/playlists/${provider}/${providerId}`);
}

// ---------------------------------------------------------------------------
// Radio
// ---------------------------------------------------------------------------

export async function getRadioTracks(station: RadioStation, limit = 30): Promise<Track[]> {
  if (isBrowserMode()) {
    const primary = primaryBrowserProvider();
    try {
      const tracks = await primary.getRadioTracks(station, limit);
      if (tracks.length >= 8) return tracks;
      return fullStreamBrowserProvider().getRadioTracks(station, limit);
    } catch {
      return fullStreamBrowserProvider().getRadioTracks(station, limit).catch(() => []);
    }
  }
  try {
    const data = await api<{ tracks: Track[] }>(`/api/radio/${station.id}/tracks`);
    return data.tracks;
  } catch (e) {
    if ((e as { status?: number }).status === 503) {
      return primaryBrowserProvider().getRadioTracks(station, limit).catch(() => []);
    }
    throw e;
  }
}

export async function trackRadio(track: Track, limit = 20): Promise<Track[]> {
  if (isBrowserMode()) {
    try {
      const tracks = await primaryBrowserProvider().trackRadio(track, limit);
      if (tracks.length > 0) return tracks;
    } catch { /* fall through */ }
    // Fallback: related tracks via the search chain.
    try {
      const results = await searchAll(`${track.artistName} ${track.title}`, 'song', limit);
      return results.tracks.filter((t) => t.providerTrackId !== track.providerTrackId).slice(0, limit);
    } catch {
      return [];
    }
  }
  try {
    const data = await api<{ tracks: Track[] }>(`/api/radio/track/${track.id}`, { method: 'POST' });
    return data.tracks;
  } catch (e) {
    if ((e as { status?: number }).status === 503) return primaryBrowserProvider().trackRadio(track, limit).catch(() => []);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Languages / genres
// ---------------------------------------------------------------------------

export async function getLanguages(): Promise<Language[]> {
  try { return await api<Language[]>('/api/languages'); } catch { return []; }
}

export async function getGenres(): Promise<Genre[]> {
  try { return await api<Genre[]>('/api/genres'); } catch { return []; }
}

export async function getLanguageTracks(id: number, name: string): Promise<Track[]> {
  if (isBrowserMode()) return searchAll(name, 'song', 40).then((r) => r.tracks);
  try {
    const data = await api<{ tracks: Track[] }>(`/api/languages/${id}/tracks`);
    return data.tracks;
  } catch (e) {
    if ((e as { status?: number }).status === 503) return searchAll(name, 'song', 40).then((r) => r.tracks);
    throw e;
  }
}

export async function getGenreTracks(slug: string, name: string): Promise<Track[]> {
  if (isBrowserMode()) return searchAll(name, 'song', 40).then((r) => r.tracks);
  try {
    const data = await api<{ tracks: Track[] }>(`/api/genres/${slug}/tracks`);
    return data.tracks;
  } catch (e) {
    if ((e as { status?: number }).status === 503) return searchAll(name, 'song', 40).then((r) => r.tracks);
    throw e;
  }
}

export async function getFeatured(id: number): Promise<{ featured: FeaturedPlaylist; tracks: Track[] }> {
  if (isBrowserMode()) {
    const all = await api<{ featured: FeaturedPlaylist[] }>('/api/featured').catch(() => null);
    const found = all?.featured.find((x) => x.id === id);
    const query = String((found?.seed as { query?: string } | undefined)?.query ?? found?.title ?? 'hindi hits');
    const tracks = await searchAll(query, 'song', 30).then((r) => r.tracks);
    return { featured: found ?? { id, title: query, subtitle: null, cover_url: null, provider: 'auto', seed: {}, sort: 0 }, tracks };
  }
  return api(`/api/featured/${id}`);
}

// Transliteration-aware search helper
export function buildSearchQuery(raw: string): string {
  return searchVariants(raw)[0] ?? raw;
}
