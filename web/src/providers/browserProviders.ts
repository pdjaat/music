/**
 * Browser-side legal music providers.
 *
 * Used when the server cannot reach its own providers (e.g. no YOUTUBE_API_KEY,
 * no server egress). All of these are official/public APIs used inside the
 * browser:
 *
 *  - Deezer public API  — metadata + 30s preview streams (documented JSONP output)
 *  - iTunes Search API  — metadata + 30s preview streams (CORS enabled, keyless)
 *  - Internet Archive   — full-length public-domain / CC audio (CORS enabled, keyless)
 *  - MusicBrainz        — open metadata only (CORS enabled, keyless)
 *
 * Every track is labelled with its provider and whether it is a preview.
 */

import type { Album, Artist, ProviderPlaylist, RadioStation, SearchResults, Track } from '../lib/types';

export type BrowserProviderId = 'deezer' | 'itunes' | 'internetarchive' | 'musicbrainz';

export interface BrowserProvider {
  id: BrowserProviderId;
  displayName: string;
  search(query: string, type: 'all' | 'song' | 'album' | 'artist' | 'playlist', limit: number): Promise<SearchResults>;
  trending(limit: number): Promise<Track[]>;
  newReleases(limit: number): Promise<Track[]>;
  getArtist(id: string): Promise<Artist>;
  getArtistTopTracks(id: string, limit: number): Promise<Track[]>;
  getAlbum(id: string): Promise<Album>;
  getPlaylist(id: string): Promise<ProviderPlaylist>;
  getRadioTracks(station: RadioStation, limit: number): Promise<Track[]>;
  trackRadio(track: Track, limit: number): Promise<Track[]>;
}

// ---------------------------------------------------------------------------
// JSONP transport (Deezer documents `output=jsonp`)
// ---------------------------------------------------------------------------

let jsonpSeq = 0;
function jsonp<T>(url: string, timeoutMs = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `__sangeet_jsonp_${++jsonpSeq}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Deezer timed out'));
    }, timeoutMs);
    function cleanup() {
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
    }
    (window as unknown as Record<string, unknown>)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Deezer request failed'));
    };
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Deezer
// ---------------------------------------------------------------------------

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  link: string;
  rank: number;
  explicit_lyrics: boolean;
  release_date?: string;
  artist: { id: number; name: string };
  album: { id: number; title: string; cover_medium?: string; cover_big?: string };
}
interface DeezerAlbum { id: number; title: string; cover_medium?: string; cover_big?: string; release_date?: string; artist: { id: number; name: string }; nb_tracks?: number; link?: string; tracks?: { data: DeezerTrack[] } }
interface DeezerArtist { id: number; name: string; picture_medium?: string; picture_big?: string; nb_fan?: number; link?: string }
interface DeezerPlaylist { id: number; title: string; description?: string; picture_medium?: string; picture_big?: string; nb_tracks?: number; creator?: { name: string }; link?: string; tracks?: { data: DeezerTrack[] } }

function dzTrack(t: DeezerTrack): Track {
  return {
    title: t.title,
    artistName: t.artist.name,
    albumName: t.album.title,
    artworkUrl: t.album.cover_medium ?? t.album.cover_big,
    durationSec: t.duration,
    releaseDate: t.release_date,
    year: t.release_date ? Number(t.release_date.slice(0, 4)) : undefined,
    popularity: t.rank,
    isExplicit: t.explicit_lyrics,
    provider: 'deezer',
    providerTrackId: `dz:${t.id}`,
    providerUrl: t.link,
    playable: Boolean(t.preview),
    stream: {
      kind: 'url',
      url: t.preview || undefined,
      isPreview: true,
      license: 'Deezer API — 30 second preview',
      attribution: 'Preview streamed via the Deezer API',
      providerTrackId: `dz:${t.id}`,
    },
  };
}

const deezer: BrowserProvider = {
  id: 'deezer',
  displayName: 'Deezer (official API — 30s previews)',
  async search(query, type, limit) {
    const q = encodeURIComponent(query);
    const results: SearchResults = { query, tracks: [], albums: [], artists: [], playlists: [] };
    if (type === 'all' || type === 'song') {
      const r = await jsonp<{ data?: DeezerTrack[] }>(`https://api.deezer.com/search?q=${q}&limit=${limit}`);
      results.tracks = (r.data ?? []).map(dzTrack);
    }
    if (type === 'all' || type === 'album') {
      const r = await jsonp<{ data?: DeezerAlbum[] }>(`https://api.deezer.com/search/album?q=${q}&limit=${Math.min(limit, 10)}`);
      results.albums = (r.data ?? []).map((a) => ({
        title: a.title, artistName: a.artist.name, coverUrl: a.cover_medium ?? a.cover_big,
        releaseDate: a.release_date, trackCount: a.nb_tracks, provider: 'deezer',
        providerAlbumId: `dz:${a.id}`, providerUrl: a.link,
      }));
    }
    if (type === 'all' || type === 'artist') {
      const r = await jsonp<{ data?: DeezerArtist[] }>(`https://api.deezer.com/search/artist?q=${q}&limit=${Math.min(limit, 10)}`);
      results.artists = (r.data ?? []).map((a) => ({
        name: a.name, imageUrl: a.picture_medium ?? a.picture_big, provider: 'deezer',
        providerArtistId: `dz:${a.id}`, providerUrl: a.link,
      }));
    }
    if (type === 'all' || type === 'playlist') {
      const r = await jsonp<{ data?: DeezerPlaylist[] }>(`https://api.deezer.com/search/playlist?q=${q}&limit=${Math.min(limit, 6)}`);
      results.playlists = (r.data ?? []).map((p) => ({
        title: p.title, description: p.description, coverUrl: p.picture_medium ?? p.picture_big,
        trackCount: p.nb_tracks, owner: p.creator?.name, provider: 'deezer',
        providerPlaylistId: `dz:${p.id}`, providerUrl: p.link,
      }));
    }
    return results;
  },
  async trending(limit) {
    const r = await jsonp<{ data?: DeezerTrack[] }>(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
    return (r.data ?? []).map(dzTrack);
  },
  async newReleases(limit) {
    const r = await jsonp<{ data?: DeezerAlbum[] }>(`https://api.deezer.com/editorial/0/releases?limit=${Math.min(limit, 30)}`);
    const albums = r.data ?? [];
    const tracks: Track[] = [];
    // Fan out album lookups in parallel, capped — a slow album must not stall the rail.
    const first = albums.slice(0, 4);
    const details = await Promise.allSettled(
      first.map((a) => jsonp<DeezerAlbum>(`https://api.deezer.com/album/${a.id}`)),
    );
    for (const d of details) {
      if (d.status === 'fulfilled') {
        const t = d.value.tracks?.data?.[0];
        if (t) tracks.push(dzTrack(t));
      }
    }
    return tracks;
  },
  async getArtist(id) {
    const raw = id.replace('dz:', '');
    const a = await jsonp<DeezerArtist>(`https://api.deezer.com/artist/${raw}`);
    return { name: a.name, imageUrl: a.picture_medium ?? a.picture_big, provider: 'deezer', providerArtistId: id, providerUrl: a.link };
  },
  async getArtistTopTracks(id, limit) {
    const raw = id.replace('dz:', '');
    const r = await jsonp<{ data?: DeezerTrack[] }>(`https://api.deezer.com/artist/${raw}/top?limit=${limit}`);
    return (r.data ?? []).map(dzTrack);
  },
  async getAlbum(id) {
    const raw = id.replace('dz:', '');
    const a = await jsonp<DeezerAlbum>(`https://api.deezer.com/album/${raw}`);
    return {
      title: a.title, artistName: a.artist.name, coverUrl: a.cover_medium ?? a.cover_big,
      releaseDate: a.release_date, trackCount: a.nb_tracks, provider: 'deezer',
      providerAlbumId: id, providerUrl: a.link,
      tracks: (a.tracks?.data ?? []).map(dzTrack),
    };
  },
  async getPlaylist(id) {
    const raw = id.replace('dz:', '');
    const p = await jsonp<DeezerPlaylist>(`https://api.deezer.com/playlist/${raw}`);
    return {
      title: p.title, description: p.description, coverUrl: p.picture_medium ?? p.picture_big,
      trackCount: p.nb_tracks, owner: p.creator?.name, provider: 'deezer',
      providerPlaylistId: id, providerUrl: p.link,
      tracks: (p.tracks?.data ?? []).map(dzTrack),
    };
  },
  async getRadioTracks(station, limit) {
    const seed = (station.seed ?? {}) as { query?: string };
    return this.search(seed.query || station.name, 'song', limit).then((r) => r.tracks);
  },
  async trackRadio(track, limit) {
    const raw = track.providerTrackId.replace('dz:', '');
    const r = await jsonp<{ data?: DeezerTrack[] }>(`https://api.deezer.com/track/${raw}/radio?limit=${limit}`);
    return (r.data ?? []).map(dzTrack);
  },
};

// ---------------------------------------------------------------------------
// iTunes Search API (CORS enabled)
// ---------------------------------------------------------------------------

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  primaryGenreName?: string;
  collectionId?: number;
  artistId?: number;
  trackViewUrl?: string;
}
interface ITunesResponse { results: ITunesResult[] }

async function itunesFetch(url: string): Promise<ITunesResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API ${res.status}`);
  return res.json() as Promise<ITunesResponse>;
}

function itTrack(r: ITunesResult): Track {
  return {
    title: r.trackName,
    artistName: r.artistName,
    albumName: r.collectionName,
    artworkUrl: r.artworkUrl100?.replace('100x100bb', '300x300bb'),
    durationSec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    releaseDate: r.releaseDate,
    year: r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : undefined,
    genres: r.primaryGenreName ? [r.primaryGenreName] : undefined,
    provider: 'itunes',
    providerTrackId: `it:${r.trackId}`,
    providerUrl: r.trackViewUrl,
    playable: Boolean(r.previewUrl),
    stream: {
      kind: 'url',
      url: r.previewUrl || undefined,
      isPreview: true,
      license: 'iTunes Preview — 30 seconds',
      attribution: 'Preview streamed via the iTunes Search API',
      providerTrackId: `it:${r.trackId}`,
    },
  };
}

const itunes: BrowserProvider = {
  id: 'itunes',
  displayName: 'iTunes Search API (official — 30s previews)',
  async search(query, type, limit) {
    const q = encodeURIComponent(query);
    const results: SearchResults = { query, tracks: [], albums: [], artists: [], playlists: [] };
    const entity = type === 'album' ? 'album' : type === 'artist' ? 'musicArtist' : type === 'playlist' ? 'playlist' : 'song';
    if (type === 'all') {
      const [songs, albums, artists] = await Promise.all([
        itunesFetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&country=IN&limit=${limit}`),
        itunesFetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=album&country=IN&limit=8`),
        itunesFetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=musicArtist&country=IN&limit=8`),
      ]);
      results.tracks = songs.results.map(itTrack);
      results.albums = albums.results.map((r) => ({
        title: r.collectionName ?? r.trackName, artistName: r.artistName,
        coverUrl: r.artworkUrl100?.replace('100x100bb', '300x300bb'),
        releaseDate: r.releaseDate, provider: 'itunes',
        providerAlbumId: `it:${r.collectionId ?? r.trackId}`,
      }));
      results.artists = artists.results.map((r) => ({
        name: r.artistName, imageUrl: r.artworkUrl100, provider: 'itunes',
        providerArtistId: `it:${r.artistId ?? r.trackId}`,
      }));
    } else {
      const r = await itunesFetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=${entity}&country=IN&limit=${limit}`);
      if (type === 'song') results.tracks = r.results.map(itTrack);
      if (type === 'album') results.albums = r.results.map((x) => ({ title: x.collectionName ?? x.trackName, artistName: x.artistName, coverUrl: x.artworkUrl100?.replace('100x100bb', '300x300bb'), releaseDate: x.releaseDate, provider: 'itunes', providerAlbumId: `it:${x.collectionId ?? x.trackId}` }));
      if (type === 'artist') results.artists = r.results.map((x) => ({ name: x.artistName, imageUrl: x.artworkUrl100, provider: 'itunes', providerArtistId: `it:${x.artistId ?? x.trackId}` }));
    }
    return results;
  },
  async trending(limit) {
    const r = await itunesFetch(`https://rss.applemarketingtools.com/api/v2/in/music/most-played/${Math.min(limit, 50)}/songs.json`);
    const data = (r as unknown as { feed?: { results?: ITunesResult[] } }).feed?.results ?? [];
    return data.map(itTrack);
  },
  async newReleases(limit) {
    const r = await itunesFetch(`https://rss.applemarketingtools.com/api/v2/in/music/hot-tracks/${Math.min(limit, 50)}/songs.json`);
    const data = (r as unknown as { feed?: { results?: ITunesResult[] } }).feed?.results ?? [];
    return data.map(itTrack);
  },
  async getArtist(id) {
    return { name: id.replace('it:', ''), provider: 'itunes', providerArtistId: id };
  },
  async getArtistTopTracks(id, limit) {
    const q = encodeURIComponent(id.replace('it:', ''));
    const r = await itunesFetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&attribute=artistTerm&country=IN&limit=${limit}`);
    return r.results.map(itTrack);
  },
  async getAlbum(id) {
    const raw = id.replace('it:', '');
    const r = await itunesFetch(`https://itunes.apple.com/lookup?id=${raw}&entity=song&country=IN`);
    const album = r.results[0];
    if (!album) throw new Error('Album not found');
    return {
      title: album.collectionName ?? album.trackName, artistName: album.artistName,
      coverUrl: album.artworkUrl100?.replace('100x100bb', '300x300bb'),
      releaseDate: album.releaseDate, provider: 'itunes', providerAlbumId: id,
      tracks: r.results.slice(1).map(itTrack),
    };
  },
  async getPlaylist() { throw new Error('iTunes playlists are not available via the public search API.'); },
  async getRadioTracks(station, limit) {
    const seed = (station.seed ?? {}) as { query?: string };
    return this.search(seed.query || station.name, 'song', limit).then((r) => r.tracks);
  },
  async trackRadio(track, limit) {
    return this.search(`${track.artistName} ${track.title}`, 'song', limit).then((r) => r.tracks.filter((t) => t.providerTrackId !== track.providerTrackId).slice(0, limit));
  },
};

// ---------------------------------------------------------------------------
// Internet Archive (CORS enabled)
// ---------------------------------------------------------------------------

interface IaSearch { response?: { docs?: Array<Record<string, string | number>> } }
interface IaMeta { metadata?: { title?: string; creator?: string | string[]; date?: string; licenseurl?: string }; files?: Array<{ name?: string; format?: string; length?: string }> }

async function iaGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Internet Archive ${res.status}`);
  return res.json() as Promise<T>;
}

const IA_AUDIO = new Set(['VBR MP3', 'MP3', '128Kbps MP3', '64Kbps MP3', 'Ogg Vorbis', 'FLAC']);

function iaTrack(identifier: string, file: string, meta: { title?: string; creator?: string | string[]; date?: string }, lengthSec?: number): Track {
  const creator = Array.isArray(meta.creator) ? meta.creator[0] : (meta.creator ?? 'Various Artists');
  return {
    title: file.replace(/\.(mp3|ogg|flac|m4a|aac)$/i, '').replace(/^\d+\s*[-_]\s*/, ''),
    artistName: String(creator),
    albumName: meta.title ?? identifier,
    artworkUrl: `https://archive.org/services/img/${identifier}`,
    durationSec: lengthSec,
    releaseDate: meta.date ? String(meta.date).slice(0, 10) : undefined,
    provider: 'internetarchive',
    providerTrackId: `ia:${identifier}/${file}`,
    providerUrl: `https://archive.org/details/${identifier}`,
    playable: true,
    stream: {
      kind: 'url',
      url: `https://archive.org/download/${identifier}/${encodeURIComponent(file)}`,
      isPreview: false,
      license: 'See item page (public domain / CC)',
      attribution: `Streamed from Internet Archive: ${meta.title ?? identifier}`,
      providerTrackId: `ia:${identifier}/${file}`,
    },
  };
}

async function iaItemTracks(identifier: string, max = 3): Promise<Track[]> {
  const meta = await iaGet<IaMeta>(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  const files = (meta.files ?? [])
    .filter((f) => f.name && (IA_AUDIO.has(f.format ?? '') || /\.(mp3|ogg|flac|m4a)$/i.test(f.name ?? '')))
    .filter((f) => !/\.(jpg|jpeg|png|xml|txt|json|zip|torrent)$/i.test(f.name ?? ''))
    .slice(0, max);
  return files.map((f) => iaTrack(identifier, f.name!, meta.metadata ?? {}, f.length ? Math.round(Number(f.length)) : undefined));
}

async function iaSearchDocs(query: string, rows: number, sort = 'downloads desc'): Promise<Array<Record<string, string | number>>> {
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`(${query}) AND mediatype:audio`)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=downloads&rows=${rows}&page=1&output=json&sort[]=${encodeURIComponent(sort)}`;
  const res = await iaGet<IaSearch>(url);
  return res.response?.docs ?? [];
}

const internetArchive: BrowserProvider = {
  id: 'internetarchive',
  displayName: 'Internet Archive (full-length legal audio)',
  async search(query, _type, limit) {
    const docs = await iaSearchDocs(query, Math.min(limit, 30));
    const tracks: Track[] = [];
    const albums: Album[] = [];
    for (const doc of docs.slice(0, 6)) {
      const identifier = String(doc.identifier);
      albums.push({ title: String(doc.title ?? identifier), artistName: String(doc.creator ?? 'Various Artists'), coverUrl: `https://archive.org/services/img/${identifier}`, provider: 'internetarchive', providerAlbumId: `ia:${identifier}`, providerUrl: `https://archive.org/details/${identifier}` });
      try {
        tracks.push(...(await iaItemTracks(identifier, 3)));
      } catch { /* skip */ }
      if (tracks.length >= limit) break;
    }
    return { query, tracks: tracks.slice(0, limit), albums, artists: [], playlists: [] };
  },
  async trending(limit) {
    const docs = await iaSearchDocs('bollywood OR punjabi OR hindi', 8);
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 5)) {
      try { tracks.push(...(await iaItemTracks(String(doc.identifier), 3))); } catch { /* skip */ }
      if (tracks.length >= limit) break;
    }
    return tracks.slice(0, limit);
  },
  async newReleases(limit) {
    const docs = await iaSearchDocs('hindi OR bollywood OR punjabi', 8, 'date desc');
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 5)) {
      try { tracks.push(...(await iaItemTracks(String(doc.identifier), 3))); } catch { /* skip */ }
      if (tracks.length >= limit) break;
    }
    return tracks.slice(0, limit);
  },
  async getArtist(id) {
    const name = id.replace('ia:', '');
    return { name, provider: 'internetarchive', providerArtistId: id, providerUrl: `https://archive.org/search?query=creator%3A%22${encodeURIComponent(name)}%22` };
  },
  async getArtistTopTracks(id, limit) {
    const name = id.replace('ia:', '');
    const docs = await iaSearchDocs(`creator:"${name}"`, 6);
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 4)) {
      try { tracks.push(...(await iaItemTracks(String(doc.identifier), 4))); } catch { /* skip */ }
    }
    return tracks.slice(0, limit);
  },
  async getAlbum(id) {
    const identifier = id.replace('ia:', '');
    const tracks = await iaItemTracks(identifier, 50);
    const meta = await iaGet<IaMeta>(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    const creator = Array.isArray(meta.metadata?.creator) ? meta.metadata.creator[0] : (meta.metadata?.creator ?? 'Various Artists');
    return { title: meta.metadata?.title ?? identifier, artistName: String(creator), coverUrl: `https://archive.org/services/img/${identifier}`, provider: 'internetarchive', providerAlbumId: id, providerUrl: `https://archive.org/details/${identifier}`, tracks };
  },
  async getPlaylist(id) {
    const identifier = id.replace('ia:', '');
    const tracks = await iaItemTracks(identifier, 50);
    return { title: identifier, provider: 'internetarchive', providerPlaylistId: id, providerUrl: `https://archive.org/details/${identifier}`, tracks };
  },
  async getRadioTracks(station, limit) {
    const seed = (station.seed ?? {}) as { query?: string; language?: string; genre?: string };
    const q = seed.query || seed.language || seed.genre || station.name;
    const docs = await iaSearchDocs(String(q), 8);
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 5)) {
      try { tracks.push(...(await iaItemTracks(String(doc.identifier), 3))); } catch { /* skip */ }
      if (tracks.length >= limit) break;
    }
    return tracks.slice(0, limit);
  },
  async trackRadio(track, limit) {
    return this.search(`${track.artistName}`, 'song', limit).then((r) => r.tracks.filter((t) => t.providerTrackId !== track.providerTrackId).slice(0, limit));
  },
};

// ---------------------------------------------------------------------------
// MusicBrainz (metadata only)
// ---------------------------------------------------------------------------

interface MbRecording { id: string; title: string; 'artist-credit'?: Array<{ name?: string }>; releases?: Array<{ title: string; date?: string }>; length?: number }

const musicbrainz: BrowserProvider = {
  id: 'musicbrainz',
  displayName: 'MusicBrainz (open metadata)',
  async search(query, _type, limit) {
    const res = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=${Math.min(limit, 10)}`, {
      headers: { 'User-Agent': 'Sangeet/1.0 (music streaming web app)' },
    });
    if (!res.ok) throw new Error('MusicBrainz unavailable');
    const data = (await res.json()) as { recordings?: MbRecording[] };
    const tracks: Track[] = (data.recordings ?? []).map((r) => ({
      title: r.title,
      artistName: r['artist-credit']?.[0]?.name ?? 'Unknown Artist',
      albumName: r.releases?.[0]?.title,
      releaseDate: r.releases?.[0]?.date,
      durationSec: r.length ? Math.round(r.length / 1000) : undefined,
      provider: 'musicbrainz',
      providerTrackId: `mb:${r.id}`,
      providerUrl: `https://musicbrainz.org/recording/${r.id}`,
      playable: false,
      stream: { kind: 'unavailable', isPreview: false, providerTrackId: `mb:${r.id}`, attribution: 'Metadata from MusicBrainz (CC0). No audio stream.' },
    }));
    return { query, tracks, albums: [], artists: [], playlists: [] };
  },
  async trending() { return []; },
  async newReleases() { return []; },
  async getArtist(id) { return { name: id.replace('mb:', ''), provider: 'musicbrainz', providerArtistId: id }; },
  async getArtistTopTracks() { return []; },
  async getAlbum() { throw new Error('Not supported'); },
  async getPlaylist() { throw new Error('Not supported'); },
  async getRadioTracks() { return []; },
  async trackRadio() { return []; },
};

// ---------------------------------------------------------------------------
// Registry + mode helpers
// ---------------------------------------------------------------------------

export const browserProviders: Record<BrowserProviderId, BrowserProvider> = {
  deezer, itunes, internetarchive: internetArchive, musicbrainz,
};

export function primaryBrowserProvider(): BrowserProvider {
  return deezer;
}

export function fallbackBrowserProvider(): BrowserProvider {
  return itunes;
}

export function fullStreamBrowserProvider(): BrowserProvider {
  return internetArchive;
}
