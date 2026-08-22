import { getDb } from '../db/index.js';

export function logEvent(type: string, message: string, detail?: unknown): void {
  try {
    getDb().prepare('INSERT INTO admin_events (type, message, detail) VALUES (?, ?, ?)')
      .run(type, message, detail ? JSON.stringify(detail).slice(0, 2000) : null);
  } catch {
    // logging must never break a request
  }
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

export function adminStats(): AdminStats {
  const db = getDb();
  const q = <T>(sql: string, ...args: Array<string | number | null>): T => db.prepare(sql).get(...args) as T;
  const totals = {
    users: q<{ c: number }>('SELECT COUNT(*) AS c FROM users').c,
    activeUsers7d: q<{ c: number }>('SELECT COUNT(DISTINCT user_id) AS c FROM listening_history WHERE played_at >= datetime(\'now\', \'-7 days\')').c,
    songs: q<{ c: number }>('SELECT COUNT(*) AS c FROM songs').c,
    artists: q<{ c: number }>('SELECT COUNT(*) AS c FROM artists').c,
    albums: q<{ c: number }>('SELECT COUNT(*) AS c FROM albums').c,
    playlists: q<{ c: number }>('SELECT COUNT(*) AS c FROM playlists').c,
    likes: q<{ c: number }>('SELECT COUNT(*) AS c FROM liked_songs').c,
    plays7d: q<{ c: number }>('SELECT COUNT(*) AS c FROM listening_history WHERE played_at >= datetime(\'now\', \'-7 days\')').c,
    providers: q<{ c: number }>('SELECT COUNT(*) AS c FROM providers').c,
    radioStations: q<{ c: number }>('SELECT COUNT(*) AS c FROM radio_stations WHERE enabled = 1').c,
  };

  const mostPlayedSongs = db.prepare(`
    SELECT h.song_id, s.title, s.artist_name AS artist, COUNT(*) AS plays
    FROM listening_history h JOIN songs s ON s.id = h.song_id
    GROUP BY h.song_id ORDER BY plays DESC LIMIT 10
  `).all() as Array<{ song_id: number; title: string; artist: string; plays: number }>;

  const mostPlayedArtists = db.prepare(`
    SELECT s.artist_name AS artist, COUNT(*) AS plays
    FROM listening_history h JOIN songs s ON s.id = h.song_id
    GROUP BY s.artist_name ORDER BY plays DESC LIMIT 10
  `).all() as Array<{ artist: string; plays: number }>;

  const popularLanguages = db.prepare(`
    SELECT COALESCE(s.language, 'Unknown') AS language, COUNT(*) AS plays
    FROM listening_history h JOIN songs s ON s.id = h.song_id
    GROUP BY language ORDER BY plays DESC LIMIT 10
  `).all() as Array<{ language: string; plays: number }>;

  const popularGenres = db.prepare(`
    SELECT COALESCE(pt.metadata, '{}') AS metadata, COUNT(*) AS plays
    FROM listening_history h
    JOIN provider_tracks pt ON pt.song_id = h.song_id
    GROUP BY pt.song_id ORDER BY plays DESC LIMIT 200
  `).all() as Array<{ metadata: string; plays: number }>;

  const genreMap = new Map<string, number>();
  for (const g of popularGenres) {
    try {
      const m = JSON.parse(g.metadata);
      const album = m.album ?? '';
      const guess = guessGenre(album);
      if (guess) genreMap.set(guess, (genreMap.get(guess) ?? 0) + g.plays);
    } catch { /* ignore */ }
  }

  return {
    totals,
    mostPlayedSongs,
    mostPlayedArtists,
    popularLanguages,
    popularGenres: [...genreMap.entries()].map(([genre, plays]) => ({ genre, plays })).sort((a, b) => b.plays - a.plays).slice(0, 10),
  };
}

function guessGenre(album: string): string | null {
  const a = album.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/bhajan|aarti|mantra|kirtan/, 'Devotional'],
    [/qawwali|sufi/, 'Sufi'],
    [/ghazal/, 'Ghazal'],
    [/punjabi|bhangra/, 'Punjabi'],
    [/haryanvi/, 'Haryanvi'],
    [/tamil/, 'Tamil'],
    [/bengali/, 'Bengali'],
    [/classical|raga|raag/, 'Classical'],
    [/folk/, 'Folk'],
  ];
  for (const [re, name] of map) if (re.test(a)) return name;
  return null;
}

export function searchTrends(limit = 15): Array<{ query: string; count: number; last: string }> {
  return getDb().prepare(`
    SELECT query, COUNT(*) AS count, MAX(created_at) AS last
    FROM search_log GROUP BY query ORDER BY count DESC, last DESC LIMIT ?
  `).all(limit) as Array<{ query: string; count: number; last: string }>;
}

export function recentEvents(limit = 30): Array<{ id: number; type: string; message: string; detail: string | null; created_at: string }> {
  return getDb().prepare('SELECT * FROM admin_events ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as Array<{
    id: number; type: string; message: string; detail: string | null; created_at: string;
  }>;
}

export function recentContent(limit = 20): Array<{ id: number; title: string; artist: string; language: string | null; created_at: string }> {
  return getDb().prepare('SELECT id, title, artist_name AS artist, language, created_at FROM songs ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as Array<{
    id: number; title: string; artist: string; language: string | null; created_at: string;
  }>;
}
