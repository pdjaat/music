import { getDb } from '../db/index.js';
import { Track } from '../providers/types.js';
import { dedupKey, normalizeText } from '../utils/normalize.js';

/**
 * Catalog service: ingests provider results into the canonical local catalog.
 *
 * Dedup rule: songs are unique on (normalized_title, normalized_artist). The
 * same song returned by several providers maps to one `songs` row; each
 * provider keeps its own provider_tracks row with its stream details.
 */

export interface DbTrack extends Track {
  id: number;
}

interface SongRow {
  id: number;
  title: string;
  artist_name: string;
  album_name: string | null;
  artwork_url: string | null;
  duration_sec: number | null;
  release_date: string | null;
  year: number | null;
  language: string | null;
  is_explicit: number;
  popularity: number;
  lyrics: string | null;
  created_at: string;
}

export function upsertTrack(t: Track): DbTrack {
  const db = getDb();
  const normTitle = normalizeText(t.title);
  const normArtist = normalizeText(t.artistName);
  if (!normTitle) throw new Error('Track requires a title');

  // Upsert artist
  let artistId: number | null = null;
  if (normArtist) {
    db.prepare('INSERT OR IGNORE INTO artists (name, normalized_name, image_url) VALUES (?, ?, ?)')
      .run(t.artistName, normArtist, t.artworkUrl ?? null);
    const a = db.prepare('SELECT id FROM artists WHERE normalized_name = ?').get(normArtist) as { id: number } | undefined;
    artistId = a?.id ?? null;
  }

  // Upsert album
  let albumId: number | null = null;
  if (t.albumName && artistId !== null) {
    const normAlbum = normalizeText(t.albumName);
    db.prepare('INSERT OR IGNORE INTO albums (title, normalized_title, artist_id, artist_name, cover_url, release_date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(t.albumName, normAlbum, artistId, t.artistName, t.artworkUrl ?? null, t.releaseDate ?? null);
    const al = db.prepare('SELECT id FROM albums WHERE normalized_title = ? AND artist_id = ?').get(normAlbum, artistId) as { id: number } | undefined;
    albumId = al?.id ?? null;
  }

  // Upsert song (dedup on title+artist)
  const key = dedupKey(t.title, t.artistName);
  const existing = db.prepare('SELECT id FROM songs WHERE normalized_title = ? AND normalized_artist = ?')
    .get(normTitle, normArtist) as { id: number } | undefined;
  let songId: number;
  if (existing) {
    songId = existing.id;
    db.prepare(`UPDATE songs SET
        artist_id = COALESCE(?, artist_id), album_id = COALESCE(?, album_id), album_name = COALESCE(?, album_name),
        artwork_url = COALESCE(?, artwork_url), duration_sec = COALESCE(?, duration_sec),
        release_date = COALESCE(?, release_date), year = COALESCE(?, year), language = COALESCE(?, language),
        is_explicit = ?, popularity = MAX(popularity, ?), lyrics = COALESCE(?, lyrics)
      WHERE id = ?`)
      .run(artistId, albumId, t.albumName ?? null, t.artworkUrl ?? null, t.durationSec ?? null,
        t.releaseDate ?? null, t.year ?? null, t.language ?? null, t.isExplicit ? 1 : 0, t.popularity ?? 0, t.lyrics ?? null, songId);
  } else {
    const info = db.prepare(`INSERT INTO songs
      (title, normalized_title, artist_name, normalized_artist, artist_id, album_id, album_name,
       artwork_url, duration_sec, release_date, year, language, is_explicit, popularity, lyrics)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.title, normTitle, t.artistName, normArtist, artistId, albumId, t.albumName ?? null,
        t.artworkUrl ?? null, t.durationSec ?? null, t.releaseDate ?? null, t.year ?? null, t.language ?? null,
        t.isExplicit ? 1 : 0, t.popularity ?? 0, t.lyrics ?? null);
    songId = Number(info.lastInsertRowid);
  }

  // Upsert provider track mapping (stream details live here)
  const stream = t.stream;
  db.prepare(`INSERT OR REPLACE INTO provider_tracks
    (provider_id, provider_track_id, song_id, stream_url, video_id, stream_kind, is_preview, license, attribution, provider_page_url, stream_expires_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      t.provider,
      t.providerTrackId,
      songId,
      stream.url ?? null,
      stream.videoId ?? null,
      stream.kind,
      stream.isPreview ? 1 : 0,
      stream.license ?? null,
      stream.attribution ?? null,
      t.providerUrl ?? null,
      stream.expiresAt ? new Date(stream.expiresAt).toISOString() : null,
      JSON.stringify({ title: t.title, artist: t.artistName, album: t.albumName ?? null }),
    );

  return toDbTrack(songId);
}

function toDbTrack(songId: number, preferProvider?: string): DbTrack {
  const db = getDb();
  const s = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId) as unknown as SongRow;
  const providers = db.prepare(
    'SELECT provider_id, provider_track_id, stream_url, video_id, stream_kind, is_preview, license, attribution, provider_page_url, stream_expires_at FROM provider_tracks WHERE song_id = ? ORDER BY is_preview ASC, rowid ASC',
  ).all(songId) as Array<{
    provider_id: string; provider_track_id: string; stream_url: string | null; video_id: string | null;
    stream_kind: string; is_preview: number; license: string | null; attribution: string | null;
    provider_page_url: string | null; stream_expires_at: string | null;
  }>;

  let chosen = providers[0];
  if (preferProvider) {
    chosen = providers.find((p) => p.provider_id === preferProvider) ?? chosen;
  }
  const hasPlayable = providers.some((p) => p.stream_kind === 'youtube' || p.stream_kind === 'url');

  return {
    id: s.id,
    title: s.title,
    artistName: s.artist_name,
    albumName: s.album_name ?? undefined,
    artworkUrl: s.artwork_url ?? undefined,
    durationSec: s.duration_sec ?? undefined,
    releaseDate: s.release_date ?? undefined,
    year: s.year ?? undefined,
    language: s.language ?? undefined,
    isExplicit: Boolean(s.is_explicit),
    popularity: s.popularity,
    lyrics: s.lyrics ?? null,
    provider: chosen?.provider_id ?? 'unknown',
    providerTrackId: chosen?.provider_track_id ?? '',
    providerUrl: chosen?.provider_page_url ?? undefined,
    stream: chosen
      ? {
          kind: chosen.stream_kind as Track['stream']['kind'],
          url: chosen.stream_url ?? undefined,
          videoId: chosen.video_id ?? undefined,
          isPreview: Boolean(chosen.is_preview),
          license: chosen.license ?? undefined,
          attribution: chosen.attribution ?? undefined,
          providerTrackId: chosen.provider_track_id,
          expiresAt: chosen.stream_expires_at ? new Date(chosen.stream_expires_at).getTime() : undefined,
        }
      : { kind: 'unavailable', isPreview: false, providerTrackId: '' },
    playable: hasPlayable,
  } as DbTrack;
}

export function getSongById(id: number, preferProvider?: string): DbTrack | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM songs WHERE id = ?').get(id) as { id: number } | undefined;
  return row ? toDbTrack(row.id, preferProvider) : null;
}

export function songExists(title: string, artist: string): number | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM songs WHERE normalized_title = ? AND normalized_artist = ?')
    .get(normalizeText(title), normalizeText(artist)) as { id: number } | undefined;
  return row?.id ?? null;
}

export function searchLocalSongs(query: string, limit = 20): DbTrack[] {
  const db = getDb();
  const like = `%${normalizeText(query)}%`;
  const rows = db.prepare(
    `SELECT id FROM songs WHERE normalized_title LIKE ? OR normalized_artist LIKE ? OR album_name LIKE ?
     ORDER BY popularity DESC LIMIT ?`,
  ).all(like, like, like, limit) as Array<{ id: number }>;
  return rows.map((r) => toDbTrack(r.id));
}

/** Build a searchable English-language hint from provider metadata (not used for play). */
export function toApiTrack(t: Track, preferProvider?: string): Track {
  return t;
}
