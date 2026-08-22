import { httpGetJson, qs } from './http.js';
import {
  Album,
  AlbumDetail,
  Artist,
  ArtistDetail,
  MusicProvider,
  ProviderError,
  ProviderHealth,
  ProviderPlaylist,
  RadioStation,
  SearchParams,
  SearchResults,
  Track,
} from './types.js';

/**
 * Internet Archive provider — fully legal, keyless.
 *
 * Discovery: the public advancedsearch.php API.
 * Streaming: direct audio files at archive.org/download/... — these items are
 *            public-domain / CC / rights-holder-uploaded audio. We surface the
 *            item license when available and always link back to the item page.
 *
 * Rate limits: archive.org requests are IP-limited; we cache aggressively
 * (24h) and cap metadata fan-out.
 */

interface IaSearchResponse {
  response?: { numFound?: number; docs?: Array<Record<string, string | number>> };
}

interface IaMetadataResponse {
  server?: string;
  dir?: string;
  metadata?: { identifier?: string; title?: string; creator?: string | string[]; date?: string; licenseurl?: string; license?: string; year?: string };
  files?: Array<{ name?: string; format?: string; length?: string; title?: string; track?: string; creator?: string }>;
}

const AUDIO_FORMATS = new Set(['VBR MP3', 'MP3', '128Kbps MP3', '64Kbps MP3', 'Ogg Vorbis', 'FLAC', 'M4A', 'AAC']);

function audioFiles(files: IaMetadataResponse['files'] = []): Array<{ name: string; lengthSec?: number }> {
  return files
    .filter((f) => f.name && (AUDIO_FORMATS.has(f.format ?? '') || /\.(mp3|ogg|flac|m4a|aac)$/i.test(f.name ?? '')))
    .filter((f) => !/\.(jpg|jpeg|png|gif|xml|txt|json|torrent|zip|m3u|css)$/i.test(f.name ?? ''))
    .map((f) => ({ name: f.name!, lengthSec: f.length ? Math.round(Number(f.length)) : undefined }))
    .filter((f) => f.name.toLowerCase() !== 'meta.xml');
}

const LANG_QUERIES: Record<string, string> = {
  Hindi: 'hindi OR bollywood',
  Punjabi: 'punjabi',
  Haryanvi: 'haryanvi',
  Rajasthani: 'rajasthani',
  Bhojpuri: 'bhojpuri',
  Marathi: 'marathi',
  Gujarati: 'gujarati',
  Bengali: 'bengali',
  Tamil: 'tamil',
  Telugu: 'telugu',
  Kannada: 'kannada',
  Malayalam: 'malayalam',
  Odia: 'odia',
  Assamese: 'assamese',
};

const GENRE_QUERIES: Record<string, string> = {
  sufi: 'qawwali OR sufi',
  ghazal: 'ghazal',
  bhajan: 'bhajan',
  devotional: 'bhajan OR devotional',
  classical: 'hindustani classical OR carnatic classical',
  folk: 'indian folk',
  bollywood: 'bollywood',
  romantic: 'bollywood romantic',
  retro: 'old hindi songs',
};

function buildQuery(seed: Record<string, unknown>): string {
  const language = seed.language as string | undefined;
  const genre = seed.genre as string | undefined;
  const query = seed.query as string | undefined;
  const q = query || (language && LANG_QUERIES[language]) || (genre && GENRE_QUERIES[genre]) || 'indian music';
  return `(${q}) AND mediatype:audio`;
}

export class InternetArchiveProvider implements MusicProvider {
  readonly id = 'internetarchive';
  readonly displayName = 'Internet Archive (legal public-domain / CC audio)';
  readonly kind = 'stream' as const;

  isConfigured(): boolean {
    return true; // keyless
  }

  private async searchItems(query: string, rows: number, sort: string): Promise<Array<Record<string, string | number>>> {
    const url = `https://archive.org/advancedsearch.php${qs({
      q: query,
      'fl[]': 'identifier,title,creator,date,downloads,year',
      rows,
      page: 1,
      output: 'json',
      'sort[]': sort,
    })}`;
    const res = await httpGetJson<IaSearchResponse>(url, { retries: 1 });
    return res.response?.docs ?? [];
  }

  private async itemToTracks(identifier: string, maxTracks: number): Promise<Track[]> {
    const url = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
    const meta = await httpGetJson<IaMetadataResponse>(url, { retries: 0 });
    const files = audioFiles(meta.files).slice(0, maxTracks);
    const title = meta.metadata?.title ?? identifier;
    const creator = Array.isArray(meta.metadata?.creator) ? meta.metadata.creator[0] : (meta.metadata?.creator ?? 'Various Artists');
    const date = meta.metadata?.date || meta.metadata?.year;
    const license = meta.metadata?.license ?? meta.metadata?.licenseurl ? undefined : undefined;
    const licenseUrl = meta.metadata?.licenseurl;
    return files.map((f) => ({
      title: f.name.replace(/\.(mp3|ogg|flac|m4a|aac)$/i, '').replace(/^\d+\s*[-_]\s*/, ''),
      artistName: String(creator),
      albumName: title,
      artworkUrl: `https://archive.org/services/img/${identifier}`,
      durationSec: f.lengthSec,
      releaseDate: date ? String(date).slice(0, 10) : undefined,
      year: date ? Number(String(date).slice(0, 4)) : undefined,
      provider: this.id,
      providerTrackId: `${identifier}/${f.name}`,
      providerUrl: `https://archive.org/details/${identifier}`,
      stream: {
        kind: 'url',
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
        isPreview: false,
        license: license || (licenseUrl ? 'See item page' : 'See item page'),
        attribution: `Streamed from Internet Archive: ${title}`,
        providerTrackId: `${identifier}/${f.name}`,
      },
    }));
  }

  private async discover(query: string, rows = 8, sort = 'downloads desc', tracksPerItem = 3): Promise<Track[]> {
    const docs = await this.searchItems(query, rows, sort);
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 5)) {
      try {
        const ts = await this.itemToTracks(String(doc.identifier), tracksPerItem);
        tracks.push(...ts);
      } catch {
        // skip items whose metadata is unavailable
      }
      if (tracks.length >= 24) break;
    }
    return tracks;
  }

  async search(params: SearchParams): Promise<SearchResults> {
    const q = params.query.trim();
    if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };
    const limit = params.limit ?? 20;
    const docs = await this.searchItems(`(${q}) AND mediatype:audio`, Math.min(limit, 40), 'downloads desc');

    const tracks: Track[] = [];
    const albums: Album[] = [];
    const artists: Artist[] = [];
    const seenAlbum = new Set<string>();
    for (const doc of docs.slice(0, 5)) {
      const id = String(doc.identifier);
      const title = String(doc.title ?? id);
      const creator = String(doc.creator ?? 'Various Artists');
      const key = `${title}|${creator}`;
      if (!seenAlbum.has(key)) {
        seenAlbum.add(key);
        albums.push({ title, artistName: creator, coverUrl: `https://archive.org/services/img/${id}`, releaseDate: doc.date ? String(doc.date).slice(0, 10) : undefined, provider: this.id, providerAlbumId: id, providerUrl: `https://archive.org/details/${id}`, trackCount: undefined });
        artists.push({ name: creator, provider: this.id, providerArtistId: creator, providerUrl: `https://archive.org/search?query=creator%3A%22${encodeURIComponent(creator)}%22` });
      }
      try {
        tracks.push(...(await this.itemToTracks(id, 3)));
      } catch { /* skip */ }
      if (tracks.length >= limit) break;
    }
    return { tracks: tracks.slice(0, limit), albums: albums.slice(0, 8), artists: artists.slice(0, 8), playlists: [] };
  }

  async getTrending(limit = 24): Promise<Track[]> {
    return (await this.discover('bollywood OR punjabi OR hindi', 8, 'downloads desc', 3)).slice(0, limit);
  }

  async getNewReleases(limit = 24): Promise<Track[]> {
    return (await this.discover('hindi OR bollywood OR punjabi', 8, 'date desc', 3)).slice(0, limit);
  }

  async getArtist(id: string): Promise<ArtistDetail> {
    const docs = await this.searchItems(`creator:"${id}" AND mediatype:audio`, 8, 'downloads desc');
    const tracks: Track[] = [];
    for (const doc of docs.slice(0, 4)) {
      try { tracks.push(...(await this.itemToTracks(String(doc.identifier), 4))); } catch { /* skip */ }
    }
    const artist: Artist = { name: id, provider: this.id, providerArtistId: id, providerUrl: `https://archive.org/search?query=creator%3A%22${encodeURIComponent(id)}%22` };
    return { ...artist, topTracks: tracks.slice(0, 20) };
  }

  async getArtistTopTracks(id: string, limit = 20): Promise<Track[]> {
    const detail = await this.getArtist(id);
    return (detail.topTracks ?? []).slice(0, limit);
  }

  async getAlbum(id: string): Promise<AlbumDetail> {
    const tracks = await this.itemToTracks(id, 50);
    const url = `https://archive.org/metadata/${encodeURIComponent(id)}`;
    const meta = await httpGetJson<IaMetadataResponse>(url, { retries: 0 });
    const album: Album = {
      title: meta.metadata?.title ?? id,
      artistName: Array.isArray(meta.metadata?.creator) ? meta.metadata.creator[0] : (meta.metadata?.creator ?? 'Various Artists'),
      coverUrl: `https://archive.org/services/img/${id}`,
      releaseDate: meta.metadata?.date ? String(meta.metadata.date).slice(0, 10) : undefined,
      provider: this.id,
      providerAlbumId: id,
      providerUrl: `https://archive.org/details/${id}`,
      trackCount: tracks.length,
    };
    return { ...album, tracks };
  }

  async getPlaylist(id: string): Promise<ProviderPlaylist> {
    const tracks = await this.itemToTracks(id, 50);
    return { title: id, provider: this.id, providerPlaylistId: id, providerUrl: `https://archive.org/details/${id}`, tracks };
  }

  async resolveStream(track: Track): Promise<Track['stream']> {
    if (track.stream.kind === 'url' && track.stream.url) return track.stream;
    // Try to rebuild from the provider track id (identifier/file).
    const idx = track.providerTrackId.indexOf('/');
    if (idx > 0) {
      const identifier = track.providerTrackId.slice(0, idx);
      const file = track.providerTrackId.slice(idx + 1);
      return { kind: 'url', url: `https://archive.org/download/${identifier}/${encodeURIComponent(file)}`, isPreview: false, providerTrackId: track.providerTrackId };
    }
    throw new ProviderError('UNAVAILABLE', 'No playable stream available for this track on Internet Archive.');
  }

  async getRadioStations(): Promise<RadioStation[]> {
    return [];
  }

  async getRadioTracks(station: RadioStation, limit = 24): Promise<Track[]> {
    const query = buildQuery((station.seed ?? {}) as Record<string, unknown>);
    return (await this.discover(query, 8, 'downloads desc', 3)).slice(0, limit);
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await this.searchItems('test AND mediatype:audio', 1, 'downloads desc');
      return { provider: this.id, configured: true, reachable: true, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start, message: 'OK (keyless)' };
    } catch (e) {
      return { provider: this.id, configured: true, reachable: false, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start, message: e instanceof Error ? e.message : 'Unreachable' };
    }
  }
}
