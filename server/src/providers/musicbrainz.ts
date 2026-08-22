import { httpGetJson } from './http.js';
import { Artist, ArtistDetail, MusicProvider, ProviderHealth, ProviderPlaylist, RadioStation, SearchParams, SearchResults, Track } from './types.js';

/**
 * MusicBrainz — open, free music metadata (no key, CC0 data).
 *
 * Used as a metadata-only provider: helps normalize/transliterate searches and
 * enriches artist/album detail. It never provides audio streams, so tracks it
 * returns carry stream.kind === 'unavailable' and are clearly marked
 * "metadata only" in the UI.
 *
 * Rate limits: 1 req/sec per IP. We serialize with a 1.15s gap and cache hard.
 */

let lastCall = 0;
async function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const wait = Math.max(0, lastCall + 1150 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  return fn();
}

interface MbRecording {
  id: string;
  title: string;
  artist?: { name: string; id: string };
  'artist-credit'?: Array<{ name?: string; artist?: { name: string; id: string } }>;
  releases?: Array<{ title: string; id: string; date?: string }>;
  genres?: Array<{ name: string }>;
  score?: number;
  length?: number; // ms
}

interface MbSearchResponse {
  recordings?: MbRecording[];
  count?: number;
}

interface MbArtist {
  id: string;
  name: string;
  disambiguation?: string;
  type?: string;
  genres?: Array<{ name: string }>;
  lifeSpan?: { begin?: string; end?: string };
  url?: Record<string, unknown>;
  relations?: Array<{ type?: string; url?: { resource?: string } }>;
}

export class MusicBrainzProvider implements MusicProvider {
  readonly id = 'musicbrainz';
  readonly displayName = 'MusicBrainz (open metadata)';
  readonly kind = 'metadata' as const;

  isConfigured(): boolean {
    return true;
  }

  private async searchRecordings(query: string, limit: number): Promise<MbRecording[]> {
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`;
    const res = await throttled(() => httpGetJson<MbSearchResponse>(url, { retries: 0 }));
    return res.recordings ?? [];
  }

  async search(params: SearchParams): Promise<SearchResults> {
    const q = params.query.trim();
    if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };
    const limit = params.limit ?? 10;
    // The search endpoint handles "title artist" and "artist title" reasonably well.
    const recs = await this.searchRecordings(q, limit);
    const tracks: Track[] = recs.map((r) => {
      const artistName = r['artist-credit']?.[0]?.name ?? r.artist?.name ?? 'Unknown Artist';
      const release = r.releases?.[0];
      return {
        title: r.title,
        artistName,
        albumName: release?.title,
        releaseDate: release?.date,
        year: release?.date ? Number(release.date.slice(0, 4)) : undefined,
        durationSec: r.length ? Math.round(r.length / 1000) : undefined,
        genres: r.genres?.map((g) => g.name),
        provider: this.id,
        providerTrackId: r.id,
        providerUrl: `https://musicbrainz.org/recording/${r.id}`,
        stream: {
          kind: 'unavailable',
          isPreview: false,
          providerTrackId: r.id,
          attribution: 'Metadata from MusicBrainz (CC0). No audio stream from this provider.',
        },
      };
    });
    return { tracks, albums: [], artists: [], playlists: [] };
  }

  async getArtist(id: string): Promise<ArtistDetail> {
    const url = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(id)}?inc=url-rels+genres&fmt=json`;
    const a = await throttled(() => httpGetJson<MbArtist>(url, { retries: 0 }));
    const wiki = a.relations?.find((r) => r.type === 'wikipedia')?.url?.resource;
    const artist: Artist = {
      name: a.name,
      imageUrl: undefined,
      bio: wiki ? `More on Wikipedia: ${wiki}` : a.disambiguation,
      provider: this.id,
      providerArtistId: a.id,
      providerUrl: `https://musicbrainz.org/artist/${a.id}`,
    };
    return artist;
  }

  async getArtistTopTracks(_id: string, _limit = 20): Promise<Track[]> {
    return [];
  }

  async getAlbum(_id: string): Promise<never> {
    throw new Error('Albums are resolved via the primary streaming provider; MusicBrainz provides metadata only.');
  }

  async getPlaylist(_id: string): Promise<ProviderPlaylist> {
    throw new Error('Playlists are resolved via the primary streaming provider.');
  }

  async resolveStream(): Promise<Track['stream']> {
    return { kind: 'unavailable', isPreview: false, providerTrackId: '', attribution: 'MusicBrainz provides metadata only.' };
  }

  async getRadioStations(): Promise<RadioStation[]> {
    return [];
  }

  async getRadioTracks(): Promise<Track[]> {
    return [];
  }

  async getTrending(_limit = 0): Promise<Track[]> {
    return [];
  }

  async getNewReleases(_limit = 0): Promise<Track[]> {
    return [];
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const recs = await this.searchRecordings('arijit singh', 1);
      if (recs.length === 0) throw new Error('empty');
      return { provider: this.id, configured: true, reachable: true, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start, message: 'OK (keyless, 1 req/s limit)' };
    } catch (e) {
      return { provider: this.id, configured: true, reachable: false, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start, message: e instanceof Error ? e.message : 'Unreachable' };
    }
  }
}
