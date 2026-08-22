import { config } from '../config.js';
import { httpGetJson, qs } from './http.js';
import {
  Album,
  AlbumDetail,
  Artist,
  ArtistDetail,
  MusicProvider,
  ProviderError,
  ProviderHealth,
  ProviderNotConfiguredError,
  ProviderPlaylist,
  RadioStation,
  RadioTracksResult,
  SearchParams,
  SearchResults,
  Track,
} from './types.js';

/**
 * YouTube provider (official APIs only).
 *
 * Discovery: YouTube Data API v3 (requires YOUTUBE_API_KEY).
 * Playback: official YouTube IFrame Player API embedded in the web client —
 *           no key needed, ads/branding are never bypassed, and every track
 *           links back to its YouTube page for attribution.
 *
 * Per YouTube API terms: content is embedded through the official player only;
 * we never download/rip audio or circumvent any protection.
 */

interface YtSearchItem {
  id: { kind: string; videoId?: string; playlistId?: string; channelId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
    channelId: string;
  };
}

interface YtVideoItem {
  id: string;
  snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } }; description: string; channelId: string };
  contentDetails: { duration: string };
  statistics?: { viewCount?: string; likeCount?: string };
}

interface YtListResponse {
  items?: YtVideoItem[];
}

interface YtSearchResponse {
  items?: YtSearchItem[];
  nextPageToken?: string;
}

interface YtPlaylistItemsResponse {
  items?: Array<{
    snippet?: { title: string; channelTitle: string; thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } }; publishedAt: string; description: string; channelId: string; playlistId: string };
    contentDetails?: { videoId: string };
  }>;
  pageInfo?: { totalResults?: number };
}

interface YtPlaylistMeta {
  items?: Array<{ snippet?: { title: string; description: string; thumbnails?: { high?: { url: string } }; channelTitle: string } }>;
}

function isoDurationToSec(iso: string): number | undefined {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!m) return undefined;
  return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

function thumb(snippet: YtSearchItem['snippet'] | YtVideoItem['snippet']): string | undefined {
  const t = snippet.thumbnails;
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url;
}

function pickLanguage(title: string): string | undefined {
  const t = title.toLowerCase();
  const map: Array<[string, string]> = [
    ['punjabi', 'Punjabi'], ['haryanvi', 'Haryanvi'], ['hindi', 'Hindi'], ['tamil', 'Tamil'],
    ['telugu', 'Telugu'], ['kannada', 'Kannada'], ['malayalam', 'Malayalam'], ['bengali', 'Bengali'],
    ['marathi', 'Marathi'], ['gujarati', 'Gujarati'], ['bhojpuri', 'Bhojpuri'], ['odia', 'Odia'],
    ['assamese', 'Assamese'], ['rajasthani', 'Rajasthani'],
  ];
  for (const [kw, lang] of map) if (t.includes(kw)) return lang;
  return undefined;
}

function toTrack(v: YtVideoItem | YtSearchItem, fallbackChannel?: string): Track | null {
  const videoId = 'contentDetails' in v ? v.id : (v.id as { videoId?: string }).videoId;
  if (!videoId) return null;
  const sn = v.snippet;
  const dur = 'contentDetails' in v ? isoDurationToSec((v as YtVideoItem).contentDetails.duration) : undefined;
  const views = 'statistics' in v ? Number((v as YtVideoItem).statistics?.viewCount ?? 0) : undefined;
  // Title often includes the artist — "Song - Artist" or "Artist - Song". Best effort.
  const title = sn.title.replace(/\(Official (Music )?Video\)/gi, '').replace(/\(Official Audio\)/gi, '').replace(/\(Lyrics\)/gi, '').trim();
  return {
    title: title || sn.title,
    artistName: fallbackChannel ?? sn.channelTitle,
    artworkUrl: thumb(sn),
    durationSec: dur,
    releaseDate: sn.publishedAt?.slice(0, 10),
    year: sn.publishedAt ? Number(sn.publishedAt.slice(0, 4)) : undefined,
    language: pickLanguage(sn.title),
    popularity: views,
    provider: 'youtube',
    providerTrackId: videoId,
    providerUrl: `https://www.youtube.com/watch?v=${videoId}`,
    stream: { kind: 'youtube', videoId, isPreview: false, providerTrackId: videoId },
  };
}

export class YouTubeProvider implements MusicProvider {
  readonly id = 'youtube';
  readonly displayName = 'YouTube (official Data API + IFrame player)';
  readonly kind = 'stream' as const;

  isConfigured(): boolean {
    return Boolean(config.youtubeApiKey);
  }

  private key(): string {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError('youtube');
    return config.youtubeApiKey;
  }

  private async api<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = `https://www.googleapis.com/youtube/v3/${path}${qs({ ...params, key: this.key() })}`;
    try {
      return await httpGetJson<T>(url, { retries: 1 });
    } catch (e) {
      if (e instanceof ProviderError && e.code === 'RATE_LIMITED') {
        throw new ProviderError('RATE_LIMITED', 'YouTube API quota exhausted for today. Discovery is temporarily limited — playback of queued tracks still works.');
      }
      throw e;
    }
  }

  async search(params: SearchParams): Promise<SearchResults> {
    const q = params.query.trim();
    if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    // YouTube search is one-dimensional; we run a couple of targeted searches and map results.
    const res = await this.api<YtSearchResponse>('search', {
      part: 'snippet',
      type: params.type === 'album' || params.type === 'artist' || params.type === 'playlist' ? params.type : 'video',
      q,
      maxResults: limit + offset,
      regionCode: 'IN',
      relevanceLanguage: 'hi',
      safeSearch: 'none',
    });
    const items = res.items ?? [];
    const sliced = items.slice(offset, offset + limit);

    if (params.type === 'artist') {
      const artists: Artist[] = sliced
        .filter((i) => i.id?.channelId)
        .map((i) => ({
          name: i.snippet.channelTitle,
          imageUrl: thumb(i.snippet),
          provider: 'youtube',
          providerArtistId: i.id.channelId!,
          providerUrl: `https://www.youtube.com/channel/${i.id.channelId}`,
        }));
      return { tracks: [], albums: [], artists, playlists: [] };
    }
    if (params.type === 'playlist') {
      const playlists: ProviderPlaylist[] = sliced
        .filter((i) => i.id?.playlistId)
        .map((i) => ({
          title: i.snippet.title,
          description: i.snippet.description,
          coverUrl: thumb(i.snippet),
          owner: i.snippet.channelTitle,
          provider: 'youtube',
          providerPlaylistId: i.id.playlistId!,
          providerUrl: `https://www.youtube.com/playlist?list=${i.id.playlistId}`,
        }));
      return { tracks: [], albums: [], artists: [], playlists };
    }
    const tracks = sliced.map((i) => toTrack(i)).filter((t): t is Track => t !== null);
    return { tracks, albums: [], artists: [], playlists: [] };
  }

  async getTrending(limit = 24): Promise<Track[]> {
    const q = 'indian music hits';
    const res = await this.search({ query: q, type: 'song', limit });
    return res.tracks;
  }

  async getNewReleases(limit = 24): Promise<Track[]> {
    const res = await this.search({ query: 'new hindi punjabi songs this week', type: 'song', limit });
    return res.tracks;
  }

  async getArtist(id: string): Promise<ArtistDetail> {
    const ch = await this.api<YtListResponse>('channels', { part: 'snippet', id });
    const item = ch.items?.[0];
    if (!item) throw new ProviderError('NOT_FOUND', 'Artist not found.');
    const artist: Artist = {
      name: item.snippet.title,
      imageUrl: item.snippet.thumbnails?.high?.url,
      bio: item.snippet.description?.slice(0, 1000),
      provider: 'youtube',
      providerArtistId: id,
      providerUrl: `https://www.youtube.com/channel/${id}`,
    };
    const top = await this.getArtistTopTracks(id, 20);
    return { ...artist, topTracks: top };
  }

  async getArtistTopTracks(id: string, limit = 20): Promise<Track[]> {
    const res = await this.api<YtSearchResponse>('search', { part: 'snippet', type: 'video', channelId: id, order: 'viewCount', maxResults: limit, regionCode: 'IN' });
    return (res.items ?? []).map((i) => toTrack(i, i.snippet.channelTitle)).filter((t): t is Track => t !== null).slice(0, limit);
  }

  async getAlbum(id: string): Promise<AlbumDetail> {
    // YouTube has no album entity; a "playlist" is the closest analogue.
    const pl = await this.getPlaylist(id);
    const album: Album = {
      title: pl.title,
      artistName: pl.owner ?? 'Various Artists',
      coverUrl: pl.coverUrl,
      provider: 'youtube',
      providerAlbumId: id,
      providerUrl: pl.providerUrl,
      tracks: pl.tracks,
    };
    return { ...album, tracks: pl.tracks ?? [] };
  }

  async getPlaylist(id: string): Promise<ProviderPlaylist> {
    const meta = await this.api<YtPlaylistMeta>('playlists', { part: 'snippet', id });
    const items = await this.api<YtPlaylistItemsResponse>('playlistItems', { part: 'snippet,contentDetails', playlistId: id, maxResults: 50 });
    const tracks: Track[] = [];
    for (const it of items.items ?? []) {
      const videoId = it.contentDetails?.videoId;
      if (!videoId || !it.snippet) continue;
      const track = toTrack({
        id: videoId,
        snippet: it.snippet,
        contentDetails: { duration: '' },
      } as unknown as YtVideoItem, it.snippet.channelTitle);
      if (track) tracks.push(track);
    }
    const m = meta.items?.[0]?.snippet;
    return {
      title: m?.title ?? 'Playlist',
      description: m?.description,
      coverUrl: m?.thumbnails?.high?.url,
      owner: m?.channelTitle,
      trackCount: items.pageInfo?.totalResults,
      provider: 'youtube',
      providerPlaylistId: id,
      providerUrl: `https://www.youtube.com/playlist?list=${id}`,
      tracks,
    };
  }

  async resolveStream(track: Track): Promise<Track['stream']> {
    if (track.stream.kind === 'youtube' && track.stream.videoId) return track.stream;
    throw new ProviderError('UNAVAILABLE', 'No playable stream available for this track on YouTube.');
  }

  async getRadioStations(): Promise<RadioStation[]> {
    // Radio stations are curated server-side (see seed). For YouTube we provide
    // category seeds rather than dynamic station lists.
    return [];
  }

  async getRadioTracks(station: RadioStation, limit = 30): Promise<Track[]> {
    const seed = (station.seed ?? {}) as { query?: string };
    const query = seed.query || 'indian music';
    const res = await this.search({ query, type: 'song', limit });
    return res.tracks;
  }

  async getLyrics(_trackId: string): Promise<string | null> {
    return null; // Lyrics are not available through the official Data API.
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      if (!this.isConfigured()) {
        return { provider: this.id, configured: false, reachable: false, checkedAt: new Date().toISOString(), message: 'Not configured — set YOUTUBE_API_KEY. Playback still works via the official embed.' };
      }
      await this.api<YtListResponse>('videos', { part: 'snippet', id: 'dQw4w9WgXcQ' });
      return { provider: this.id, configured: true, reachable: true, checkedAt: new Date().toISOString(), latencyMs: Date.now() - start, message: 'OK' };
    } catch (e) {
      return {
        provider: this.id, configured: this.isConfigured(), reachable: false, checkedAt: new Date().toISOString(),
        message: e instanceof Error ? e.message : 'Unreachable', latencyMs: Date.now() - start,
      };
    }
  }
}

export function radioTracksFromSearch(_station: RadioStation, _tracks: Track[]): RadioTracksResult {
  throw new Error('not used');
}
