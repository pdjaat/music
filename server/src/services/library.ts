import { getDb } from '../db/index.js';
import { getSongById, DbTrack } from './catalog.js';

export function likeSong(userId: number, songId: number): void {
  getDb().prepare('INSERT OR IGNORE INTO liked_songs (user_id, song_id) VALUES (?, ?)').run(userId, songId);
}

export function unlikeSong(userId: number, songId: number): void {
  getDb().prepare('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?').run(userId, songId);
}

export function isLiked(userId: number, songId: number): boolean {
  const row = getDb().prepare('SELECT 1 FROM liked_songs WHERE user_id = ? AND song_id = ?').get(userId, songId);
  return Boolean(row);
}

export function likedSongIds(userId: number): Set<number> {
  const rows = getDb().prepare('SELECT song_id FROM liked_songs WHERE user_id = ?').all(userId) as Array<{ song_id: number }>;
  return new Set(rows.map((r) => r.song_id));
}

export function likedSongs(userId: number): DbTrack[] {
  const rows = getDb().prepare(
    'SELECT song_id FROM liked_songs WHERE user_id = ? ORDER BY created_at DESC LIMIT 500',
  ).all(userId) as Array<{ song_id: number }>;
  return rows.map((r) => getSongById(r.song_id)).filter((t): t is DbTrack => t !== null);
}

export function recordRecentlyPlayed(userId: number, songId: number): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO recently_played (user_id, song_id, played_at) VALUES (?, ?, datetime(\'now\'))').run(userId, songId);
  // Keep the list bounded.
  db.prepare(`DELETE FROM recently_played WHERE user_id = ? AND song_id NOT IN (
    SELECT song_id FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT 100
  )`).run(userId, userId);
}

export function recentlyPlayed(userId: number, limit = 24): DbTrack[] {
  const rows = getDb().prepare(
    'SELECT song_id FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT ?',
  ).all(userId, limit) as Array<{ song_id: number }>;
  return rows.map((r) => getSongById(r.song_id)).filter((t): t is DbTrack => t !== null);
}

export function recordListening(userId: number, songId: number, durationSec: number, completed: boolean): void {
  getDb().prepare(
    'INSERT INTO listening_history (user_id, song_id, duration_sec, completed) VALUES (?, ?, ?, ?)',
  ).run(userId, songId, Math.max(0, Math.round(durationSec)), completed ? 1 : 0);
}

/** Aggregate the user's preferred languages/genres from history + likes. */
export function userProfile(userId: number): { languages: string[]; genres: string[]; artistIds: number[]; topSongIds: number[] } {
  const db = getDb();
  const langs = db.prepare(`
    SELECT COALESCE(s.language, 'Unknown') AS lang, COUNT(*) AS c
    FROM listening_history h JOIN songs s ON s.id = h.song_id
    WHERE h.user_id = ? AND s.language IS NOT NULL
    GROUP BY lang ORDER BY c DESC LIMIT 5
  `).all(userId) as Array<{ lang: string }>;
  const artists = db.prepare(`
    SELECT s.artist_id AS aid, COUNT(*) AS c
    FROM listening_history h JOIN songs s ON s.id = h.song_id
    WHERE h.user_id = ? AND s.artist_id IS NOT NULL
    GROUP BY aid ORDER BY c DESC LIMIT 5
  `).all(userId) as Array<{ aid: number }>;
  const topSongs = db.prepare(`
    SELECT song_id, COUNT(*) AS c FROM listening_history
    WHERE user_id = ? GROUP BY song_id ORDER BY c DESC LIMIT 10
  `).all(userId) as Array<{ song_id: number }>;
  const liked = likedSongs(userId);
  const genreSet = new Set<string>();
  for (const t of liked) for (const g of t.genres ?? []) genreSet.add(g);
  return {
    languages: langs.map((l) => l.lang),
    genres: [...genreSet],
    artistIds: artists.map((a) => a.aid),
    topSongIds: topSongs.map((s) => s.song_id),
  };
}

export type UserProfile = ReturnType<typeof userProfile>;

export const EMPTY_PROFILE: UserProfile = { languages: [], genres: [], artistIds: [], topSongIds: [] };
