// Shared client types (mirror of the server domain model).

export type StreamKind = 'youtube' | 'url' | 'unavailable';

export interface StreamInfo {
  kind: StreamKind;
  videoId?: string;
  url?: string;
  isPreview: boolean;
  license?: string;
  attribution?: string;
  providerTrackId: string;
  expiresAt?: number;
}

export interface Track {
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
  playable?: boolean;
  provider: string;
  providerTrackId: string;
  providerUrl?: string;
  stream: StreamInfo;
  lyrics?: string | null;
  liked?: boolean;
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
  topTracks?: Track[];
  albums?: Album[];
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

export interface FeaturedPlaylist {
  id: number;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  provider: string;
  seed: Record<string, unknown>;
  sort: number;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  name_native: string;
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
  name_native: string;
}

export interface HomeData {
  providersUnavailable: boolean;
  languages: Language[];
  genres: Genre[];
  stations: RadioStation[];
  featured: FeaturedPlaylist[];
  recentlyPlayed: Track[];
  continueListening: Track[];
  recommended: { tracks: Track[]; reasons: string[] };
  mixes: Array<{ title: string; subtitle: string; tracks: Track[] }>;
  newReleases: Track[];
  trending: Track[];
  providerInfo: { id: string; displayName: string; usedFallback: boolean } | null;
}

export interface SearchResults {
  query: string;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: ProviderPlaylist[];
  providersUnavailable?: boolean;
  provider?: string;
}

export interface PlaylistSummary {
  id: number;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends PlaylistSummary {
  tracks: Track[];
}

export interface ProviderHealthStatus {
  provider: string;
  configured: boolean;
  reachable: boolean;
  checkedAt: string;
  message: string;
  latencyMs?: number;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
  theme: 'dark' | 'light';
}

export interface AdminStats {
  totals: {
    users: number;
    activeUsers7d: number;
    songs: number;
    artists: number;
    albums: number;
    playlists: number;
    likes: number;
    plays7d: number;
    providers: number;
    radioStations: number;
  };
  mostPlayedSongs: Array<{ song_id: number; title: string; artist: string; plays: number }>;
  mostPlayedArtists: Array<{ artist: string; plays: number }>;
  popularLanguages: Array<{ language: string; plays: number }>;
  popularGenres: Array<{ genre: string; plays: number }>;
}
