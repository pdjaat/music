/**
 * Canonical domain model shared by every music provider.
 *
 * Providers map their own response shapes onto these types so the rest of the
 * application never depends on a specific provider's API.
 */

export type StreamKind = 'youtube' | 'url' | 'unavailable';

export interface StreamInfo {
  kind: StreamKind;
  /** For kind === 'youtube': YouTube video id played through the official IFrame API. */
  videoId?: string;
  /** For kind === 'url': direct, legal audio URL (preview mp3, archive.org file, ...). */
  url?: string;
  /** Whether this stream is a short preview rather than the full track. */
  isPreview: boolean;
  /** Human-readable license (e.g. "CC BY 4.0") when the provider exposes one. */
  license?: string;
  /** Attribution string the provider requires us to display. */
  attribution?: string;
  /** Provider-side track identifier for this stream. */
  providerTrackId: string;
  /** Epoch ms when a signed/expiring URL stops working. */
  expiresAt?: number;
}

export interface Track {
  /** Canonical song id in our DB (filled in by the catalog service). */
  id?: number;
  title: string;
  artistName: string;
  albumName?: string;
  artworkUrl?: string;
  durationSec?: number;
  releaseDate?: string;
  year?: number;
  language?: string;
  genres?: string[];
  popularity?: number;
  isExplicit?: boolean;
  /** Whether a legal playable stream exists for this track in our catalog. */
  playable?: boolean;
  /** Provider that produced this track. */
  provider: string;
  providerTrackId: string;
  /** Page on the provider's site (for "view source" attribution). */
  providerUrl?: string;
  stream: StreamInfo;
  lyrics?: string | null;
}

export interface Album {
  id?: number;
  title: string;
  artistName: string;
  artistId?: string;
  coverUrl?: string;
  releaseDate?: string;
  year?: number;
  trackCount?: number;
  provider: string;
  providerAlbumId: string;
  providerUrl?: string;
  tracks?: Track[];
}

export interface Artist {
  id?: number;
  name: string;
  imageUrl?: string;
  bio?: string;
  provider: string;
  providerArtistId: string;
  providerUrl?: string;
}

export interface ArtistDetail extends Artist {
  topTracks?: Track[];
  albums?: Album[];
  similarArtists?: Artist[];
}

export interface AlbumDetail extends Album {
  tracks: Track[];
}

export interface ProviderPlaylist {
  id?: number;
  title: string;
  description?: string;
  coverUrl?: string;
  trackCount?: number;
  owner?: string;
  provider: string;
  providerPlaylistId: string;
  providerUrl?: string;
  tracks?: Track[];
}

export interface RadioStation {
  id?: number;
  slug: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  provider: string;
  seed: Record<string, unknown>;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: ProviderPlaylist[];
}

export type SearchType = 'all' | 'song' | 'album' | 'artist' | 'playlist';

export interface SearchParams {
  query: string;
  type?: SearchType;
  limit?: number;
  offset?: number;
}

export interface ProviderHealth {
  provider: string;
  configured: boolean;
  reachable: boolean;
  checkedAt: string;
  message: string;
  latencyMs?: number;
}

export interface ProviderListResult {
  id: string;
  displayName: string;
  kind: 'stream' | 'metadata';
  enabled: boolean;
  priority: number;
  configured: boolean;
  reachable: boolean;
  message: string;
}

export interface RadioTracksResult {
  station: RadioStation;
  tracks: Track[];
}

/**
 * The provider contract. Implementations must be resilient: never throw raw
 * provider errors — wrap them in ProviderError so the API can map them to
 * friendly responses.
 */
export interface MusicProvider {
  readonly id: string;
  readonly displayName: string;
  readonly kind: 'stream' | 'metadata';
  /** True when required credentials/keys are present. */
  isConfigured(): boolean;
  search(params: SearchParams): Promise<SearchResults>;
  getTrending(limit?: number): Promise<Track[]>;
  getNewReleases(limit?: number): Promise<Track[]>;
  getArtist(id: string): Promise<ArtistDetail>;
  getArtistTopTracks(id: string, limit?: number): Promise<Track[]>;
  getAlbum(id: string): Promise<AlbumDetail>;
  getPlaylist(id: string): Promise<ProviderPlaylist>;
  /** Resolve a playable stream for a track. May be a no-op if search already returns streams. */
  resolveStream(track: Track): Promise<StreamInfo>;
  getRadioStations(): Promise<RadioStation[]>;
  getRadioTracks(station: RadioStation, limit?: number): Promise<Track[]>;
  getLyrics?(trackId: string): Promise<string | null>;
  health(): Promise<ProviderHealth>;
}

export class ProviderError extends Error {
  code:
    | 'NOT_CONFIGURED'
    | 'RATE_LIMITED'
    | 'NOT_FOUND'
    | 'UNAVAILABLE'
    | 'REGION_RESTRICTED'
    | 'INVALID_RESPONSE'
    | 'TIMEOUT'
    | 'UNKNOWN';
  constructor(code: ProviderError['code'], message: string) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
  }
}

export class ProviderNotConfiguredError extends ProviderError {
  constructor(providerId: string) {
    super('NOT_CONFIGURED', `The ${providerId} provider is not configured. Set its API key in the server environment.`);
  }
}

export function isProviderError(e: unknown): e is ProviderError {
  return e instanceof ProviderError;
}
