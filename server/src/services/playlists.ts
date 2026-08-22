import { getDb, withTransaction } from '../db/index.js';
import { getSongById, DbTrack, upsertTrack } from './catalog.js';
import { Track } from '../providers/types.js';

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
  tracks: DbTrack[];
}

export function createPlaylist(userId: number, name: string, description?: string): PlaylistSummary {
  const db = getDb();
  const info = db.prepare('INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)').run(userId, name, description ?? null);
  return getPlaylistSummary(Number(info.lastInsertRowid))!;
}

export function getPlaylistSummary(id: number): PlaylistSummary | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT p.id, p.name, p.description, p.cover_url, p.is_public, p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS track_count
    FROM playlists p WHERE p.id = ?
  `).get(id) as
    | { id: number; name: string; description: string | null; cover_url: string | null; is_public: number; created_at: string; updated_at: string; track_count: number }
    | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, description: row.description, coverUrl: row.cover_url, isPublic: Boolean(row.is_public), trackCount: row.track_count, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function listPlaylists(userId: number): PlaylistSummary[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.id, p.name, p.description, p.cover_url, p.is_public, p.created_at, p.updated_at,
      (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS track_count
    FROM playlists p WHERE p.user_id = ? ORDER BY p.updated_at DESC
  `).all(userId) as Array<{
    id: number; name: string; description: string | null; cover_url: string | null; is_public: number; created_at: string; updated_at: string; track_count: number;
  }>;
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, coverUrl: r.cover_url, isPublic: Boolean(r.is_public), trackCount: r.track_count, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export function getPlaylistDetail(id: number): PlaylistDetail | null {
  const summary = getPlaylistSummary(id);
  if (!summary) return null;
  const db = getDb();
  const rows = db.prepare(`
    SELECT ps.song_id FROM playlist_songs ps WHERE ps.playlist_id = ? ORDER BY ps.position ASC
  `).all(id) as Array<{ song_id: number }>;
  const tracks = rows.map((r) => getSongById(r.song_id)).filter((t): t is DbTrack => t !== null);
  return { ...summary, tracks };
}

export function updatePlaylist(id: number, patch: { name?: string; description?: string; isPublic?: boolean; coverUrl?: string }): PlaylistSummary | null {
  const db = getDb();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const vals: Array<string | number | null> = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.description !== undefined) { sets.push('description = ?'); vals.push(patch.description); }
  if (patch.isPublic !== undefined) { sets.push('is_public = ?'); vals.push(patch.isPublic ? 1 : 0); }
  if (patch.coverUrl !== undefined) { sets.push('cover_url = ?'); vals.push(patch.coverUrl); }
  vals.push(id);
  db.prepare(`UPDATE playlists SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getPlaylistSummary(id);
}

export function deletePlaylist(id: number): void {
  getDb().prepare('DELETE FROM playlists WHERE id = ?').run(id);
}

export function addSongToPlaylist(playlistId: number, songId: number): boolean {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(playlistId, songId);
  if (exists) return false;
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM playlist_songs WHERE playlist_id = ?').get(playlistId) as { p: number };
  db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, maxPos.p);
  db.prepare('UPDATE playlists SET updated_at = datetime(\'now\') WHERE id = ?').run(playlistId);
  return true;
}

export function removeSongFromPlaylist(playlistId: number, songId: number): void {
  const db = getDb();
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(playlistId, songId);
  db.prepare('UPDATE playlists SET updated_at = datetime(\'now\') WHERE id = ?').run(playlistId);
  renumber(playlistId);
}

export function reorderPlaylist(playlistId: number, orderedSongIds: number[]): void {
  const db = getDb();
  const existing = db.prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ?').all(playlistId) as Array<{ song_id: number }>;
  const valid = new Set(existing.map((e) => e.song_id));
  const order = orderedSongIds.filter((id) => valid.has(id));
  // Append any remaining tracks not present in the given order.
  for (const e of existing) if (!order.includes(e.song_id)) order.push(e.song_id);
  withTransaction(db, () => {
    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlistId);
    order.forEach((songId, i) => {
      db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, songId, i + 1);
    });
  });
  db.prepare('UPDATE playlists SET updated_at = datetime(\'now\') WHERE id = ?').run(playlistId);
}

function renumber(playlistId: number): void {
  const db = getDb();
  const rows = db.prepare('SELECT id, position FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC').all(playlistId) as Array<{ id: number; position: number }>;
  withTransaction(db, () => {
    rows.forEach((r, i) => db.prepare('UPDATE playlist_songs SET position = ? WHERE id = ?').run(i + 1, r.id));
  });
}

/** Persist a provider track into the catalog, then add to playlist. */
export function addTrackToPlaylist(playlistId: number, track: Track): { songId: number; added: boolean } {
  const saved = upsertTrack(track);
  const added = addSongToPlaylist(playlistId, saved.id);
  return { songId: saved.id, added };
}
