import { getDb } from '../db/index.js';
import { cached } from './cache.js';
import { resolveProvider } from '../providers/index.js';
import { Track } from '../providers/types.js';
import { userProfile, EMPTY_PROFILE, UserProfile } from './library.js';
import { upsertTrack, DbTrack, getSongById } from './catalog.js';

/**
 * Lightweight recommendation engine (MVP).
 *
 * Signals: listening history, likes, recently played, favorite artists,
 * favorite languages/genres, playlist behaviour. It builds provider searches
 * around the user's dominant languages/genres — e.g. a user who mostly listens
 * to Punjabi + Haryanvi gets Punjabi/Haryanvi recommendations, not English.
 *
 * The interface is isolated so a future ML-based recommender can replace it.
 */

export interface ForYouResult {
  tracks: DbTrack[];
  reasons: string[];
}

export async function recommendationsForUser(userId: number | undefined, limit = 24): Promise<ForYouResult> {
  const db = getDb();
  const reasons: string[] = [];

  // 1) Collaborative-ish signal: tracks other listeners of the user's top
  //    songs also play (item-based via listening_history co-occurrence).
  if (userId) {
    const seedIds = db.prepare(`
      SELECT song_id, COUNT(*) AS c FROM listening_history
      WHERE user_id = ? GROUP BY song_id ORDER BY c DESC LIMIT 5
    `).all(userId) as Array<{ song_id: number }>;
    if (seedIds.length > 0) {
      const related = db.prepare(`
        SELECT h2.song_id, COUNT(*) AS c
        FROM listening_history h1
        JOIN listening_history h2 ON h2.user_id = h1.user_id AND h2.song_id != h1.song_id
        WHERE h1.song_id IN (${seedIds.map(() => '?').join(',')}) AND h2.user_id != ?
        GROUP BY h2.song_id ORDER BY c DESC LIMIT 12
      `).all(...seedIds.map((s) => s.song_id), userId ?? -1) as Array<{ song_id: number }>;
      if (related.length > 0) {
        reasons.push('Because you listened to similar songs');
        return { tracks: related.map((r) => getSongById(r.song_id)).filter((t): t is DbTrack => t !== null), reasons };
      }
    }
  }

  // 2) Content-based: search the active provider for the user's top languages/genres.
  let profile: UserProfile = EMPTY_PROFILE;
  if (userId) profile = userProfile(userId);
  const langs = profile.languages.length ? profile.languages : ['Hindi', 'Punjabi'];
  const queryHints = [...langs, ...profile.genres].slice(0, 3);

  try {
    const { provider, usedFallback } = await resolveProvider('stream');
    if (usedFallback) reasons.push('Primary provider unavailable — showing the legal fallback provider');
    const tracks: Track[] = [];
    const seen = new Set<string>();
    for (const hint of queryHints) {
      const key = { hint, limit: 8 };
      const hits = await cached(provider.id, 'search', key, () =>
        provider.search({ query: hint, type: 'song', limit: 8 }),
      );
      for (const t of hits.tracks) {
        if (seen.has(t.providerTrackId)) continue;
        seen.add(t.providerTrackId);
        tracks.push(t);
      }
      if (tracks.length >= limit) break;
    }
    const saved = tracks.map((t) => upsertTrack(t)).slice(0, limit);
    if (saved.length > 0) {
      reasons.push(`Based on your taste: ${langs.join(', ')}${profile.genres.length ? ` and ${profile.genres.slice(0, 2).join(', ')}` : ''}`);
      return { tracks: saved, reasons };
    }
  } catch {
    // fall through to local-only recommendations
  }

  // 3) Local-only: most-played tracks in the catalog.
  const rows = db.prepare('SELECT id FROM songs ORDER BY popularity DESC, created_at DESC LIMIT ?').all(limit) as Array<{ id: number }>;
  reasons.push('Popular tracks in the catalog');
  return { tracks: rows.map((r) => getSongById(r.id)).filter((t): t is DbTrack => t !== null), reasons };
}

/** Daily mixes: a few themed mixes built from the user's favourite languages. */
export async function dailyMixes(userId: number | undefined, count = 4): Promise<Array<{ title: string; subtitle: string; tracks: DbTrack[] }>> {
  const profile = userId ? userProfile(userId) : { languages: ['Hindi', 'Punjabi'] as string[], genres: [], artistIds: [], topSongIds: [] as number[] };
  const langs = profile.languages.length ? profile.languages : ['Hindi', 'Punjabi'];
  const mixes: Array<{ title: string; subtitle: string; tracks: DbTrack[] }> = [];
  try {
    const { provider } = await resolveProvider('stream');
    for (let i = 0; i < count; i++) {
      const lang = langs[i % langs.length];
      const label = i === 0 ? 'Daily Mix 1' : `Daily Mix ${i + 1}`;
      const hits = await cached(provider.id, 'search', { mix: lang, i }, () =>
        provider.search({ query: `${lang} hits`, type: 'song', limit: 10 }),
      );
      const tracks = hits.tracks.map((t) => upsertTrack(t));
      mixes.push({ title: label, subtitle: `A mix of ${lang} favourites`, tracks });
    }
  } catch {
    // provider unavailable — mixes come back empty and the UI shows a retry card
  }
  return mixes;
}
