import { Response, Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { cached } from '../services/cache.js';
import { resolveProvider, isProviderEnabled } from '../providers/index.js';
import { Album, Artist, ProviderError, ProviderPlaylist, SearchParams, SearchType, Track } from '../providers/types.js';
import { upsertTrack, getSongById, DbTrack, searchLocalSongs } from '../services/catalog.js';
import { recentlyPlayed, likedSongIds } from '../services/library.js';
import { recommendationsForUser, dailyMixes } from '../services/recommendations.js';
import { listRadioStations, getRadioStation, radioTracks, trackRadio } from '../services/radio.js';
import { logEvent } from '../services/admin.js';
import { searchVariants } from '../utils/normalize.js';

export const browseRouter = Router();

type Result<T> = { ok: true; data: T } | { ok: false };

/**
 * Run a provider-backed operation. If the provider is unreachable / not
 * configured, returns { ok:false } so routes can answer with a structured
 * `providersUnavailable` payload and the client falls back to legal
 * browser-side providers.
 */
async function withProvider<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ProviderError && (e.code === 'UNAVAILABLE' || e.code === 'TIMEOUT' || e.code === 'NOT_CONFIGURED')) {
      logEvent('provider_error', e.message);
      return { ok: false };
    }
    throw e;
  }
}

function unavailable(res: Response, extra: Record<string, unknown> = {}) {
  return res.status(503).json({
    providersUnavailable: true,
    message: 'Music providers are currently unreachable from the server. The app falls back to legal browser-side streams.',
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

browseRouter.get('/home', async (req, res) => {
  const userId = req.user?.id;
  const db = getDb();

  const languages = db.prepare('SELECT * FROM languages ORDER BY id').all();
  const genres = db.prepare('SELECT * FROM genres ORDER BY id').all();
  const stations = listRadioStations();
  const featured = db.prepare('SELECT * FROM featured_playlists WHERE enabled = 1 ORDER BY sort ASC').all();

  const recentlyPlayedTracks = userId ? recentlyPlayed(userId, 12) : [];
  const continueListening = userId
    ? (db.prepare('SELECT song_id FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT 8').all(userId) as Array<{ song_id: number }>)
        .map((r) => getSongById(r.song_id))
        .filter((t): t is DbTrack => t !== null)
    : [];

  // Run the slow provider-backed pieces concurrently so a single dead provider
  // can't stall the home response for tens of seconds.
  const [recsRes, mixesRes, providerRes] = await Promise.allSettled([
    recommendationsForUser(userId, 12),
    dailyMixes(userId, 4),
    withProvider(async () => {
      const { provider, usedFallback } = await resolveProvider('stream');
      if (!isProviderEnabled(provider.id)) throw new ProviderError('UNAVAILABLE', 'disabled');
      const [newRel, trend] = await Promise.all([
        cached(provider.id, 'newReleases', {}, () => provider.getNewReleases(16)),
        cached(provider.id, 'trending', {}, () => provider.getTrending(16)),
      ]);
      return {
        providerInfo: { id: provider.id, displayName: provider.displayName, usedFallback },
        newReleases: newRel.map((t) => upsertTrack(t)),
        trending: trend.map((t) => upsertTrack(t)),
      };
    }),
  ]);

  const recs = recsRes.status === 'fulfilled' ? recsRes.value : { tracks: [] as DbTrack[], reasons: ['Recommendations are temporarily unavailable'] as string[] };
  const mixes = mixesRes.status === 'fulfilled' ? mixesRes.value : [];
  const providerResult = providerRes.status === 'fulfilled' ? providerRes.value : { ok: false as const };

  const base = {
    languages, genres, stations, featured,
    recentlyPlayed: recentlyPlayedTracks, continueListening,
    recommended: { tracks: recs.tracks, reasons: recs.reasons },
    mixes,
  };

  if (!providerResult.ok) {
    return res.json({ ...base, providersUnavailable: true, newReleases: [], trending: [], providerInfo: null });
  }
  res.json({ ...base, providersUnavailable: false, ...providerResult.data });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const searchSchema = z.object({
  q: z.string().max(200).default(''),
  type: z.enum(['all', 'song', 'album', 'artist', 'playlist']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(200).default(0),
});

interface ProviderSearchBundle {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: ProviderPlaylist[];
}

browseRouter.get('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid search parameters.' });
  const { q, type, limit, offset } = parsed.data;
  if (!q.trim()) return res.json({ query: q, tracks: [], albums: [], artists: [], playlists: [], local: [] });

  // 1) Local catalog hit first (fast, zero provider cost).
  const local = searchLocalSongs(q, 10);

  // 2) Provider search with transliteration variants (e.g. "अरिजीत सिंह" -> "arijit singh").
  const providerResult = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const variants = searchVariants(q);
    const bundle = await cached<ProviderSearchBundle>(provider.id, 'search', { q, variants, type, limit, offset }, async () => {
      const out: ProviderSearchBundle = { tracks: [], albums: [], artists: [], playlists: [] };
      for (const v of variants.slice(0, 2)) {
        const params: SearchParams = { query: v, type: type === 'all' ? 'song' : (type as SearchType), limit, offset };
        const r = await provider.search(params);
        out.tracks.push(...r.tracks);
        out.albums.push(...r.albums);
        out.artists.push(...r.artists);
        out.playlists.push(...r.playlists);
        if (out.tracks.length >= limit) break;
      }
      return out;
    });
    const tracks = bundle.tracks.map((t) => upsertTrack(t)).slice(0, limit);
    return { tracks, albums: bundle.albums, artists: bundle.artists, playlists: bundle.playlists, provider: provider.id };
  });

  if (!providerResult.ok) {
    try {
      getDb().prepare('INSERT INTO search_log (query, user_id, results, provider) VALUES (?, ?, ?, ?)')
        .run(q, req.user?.id ?? null, local.length, 'local-fallback');
    } catch { /* ignore */ }
    return res.json({ query: q, tracks: local, albums: [], artists: [], playlists: [], local, providersUnavailable: true });
  }

  const { tracks, albums, artists, playlists, provider } = providerResult.data;
  try {
    getDb().prepare('INSERT INTO search_log (query, user_id, results, provider) VALUES (?, ?, ?, ?)')
      .run(q, req.user?.id ?? null, tracks.length + local.length, provider);
  } catch { /* ignore */ }

  res.json({ query: q, tracks: dedupeTracks([...local, ...tracks]), albums, artists, playlists, local: local.length, providersUnavailable: false, provider });
});

function dedupeTracks(list: DbTrack[]): DbTrack[] {
  const seen = new Set<number>();
  return list.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

browseRouter.get('/tracks/:id', (req, res) => {
  const id = Number(req.params.id);
  const track = getSongById(id);
  if (!track) return res.status(404).json({ error: 'not_found', message: 'This song is not in the catalog.' });
  const db = getDb();
  const similar = db.prepare(`
    SELECT s.id FROM songs s
    WHERE s.id != ? AND (s.artist_name = ? OR s.language = ?)
    ORDER BY s.popularity DESC LIMIT 12
  `).all(id, track.artistName, track.language ?? '') as Array<{ id: number }>;
  const related = similar.map((r) => getSongById(r.id)).filter((t): t is DbTrack => t !== null);
  res.json({ track, related, liked: req.user ? likedSongIds(req.user.id).has(id) : false });
});

/** Record a play (history / recently played) and bump popularity. */
browseRouter.post('/tracks/:id/play', (req, res) => {
  const id = Number(req.params.id);
  const track = getSongById(id);
  if (!track) return res.status(404).json({ error: 'not_found', message: 'This song is not in the catalog.' });

  const db = getDb();
  const durationSec = Math.max(0, Math.min(Number(req.body?.durationSec ?? 0), 86400));
  const completed = Boolean(req.body?.completed);
  if (req.user) {
    db.prepare('INSERT OR REPLACE INTO recently_played (user_id, song_id, played_at) VALUES (?, ?, datetime(\'now\'))').run(req.user.id, id);
    if (durationSec > 5 || completed) {
      db.prepare('INSERT INTO listening_history (user_id, song_id, duration_sec, completed) VALUES (?, ?, ?, ?)').run(req.user.id, id, durationSec, completed ? 1 : 0);
    }
  } else {
    db.prepare('INSERT INTO listening_history (user_id, song_id, duration_sec, completed) VALUES (NULL, ?, ?, ?)').run(id, durationSec, completed ? 1 : 0);
  }
  db.prepare('UPDATE songs SET popularity = popularity + 1 WHERE id = ?').run(id);

  const playable = track.stream.kind === 'youtube' || track.stream.kind === 'url';
  res.json({ track, playable });
});

// ---------------------------------------------------------------------------
// Albums / Artists / Provider playlists
// ---------------------------------------------------------------------------

browseRouter.get('/albums/:provider/:providerId', async (req, res) => {
  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const album = await cached(provider.id, 'detail', { album: req.params.providerId }, () => provider.getAlbum(req.params.providerId));
    const tracks = (album.tracks ?? []).map((t) => upsertTrack(t));
    return { ...album, tracks, providerName: provider.displayName };
  });
  if (!result.ok) return unavailable(res);
  res.json(result.data);
});

browseRouter.get('/artists/:provider/:providerId', async (req, res) => {
  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const artist = await cached(provider.id, 'detail', { artist: req.params.providerId }, () => provider.getArtist(req.params.providerId));
    const topTracks = (artist.topTracks ?? []).map((t) => upsertTrack(t));
    return { ...artist, topTracks, providerName: provider.displayName };
  });
  if (!result.ok) return unavailable(res);
  res.json(result.data);
});

browseRouter.get('/playlists/:provider/:providerId', async (req, res) => {
  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const playlist = await cached(provider.id, 'detail', { playlist: req.params.providerId }, () => provider.getPlaylist(req.params.providerId));
    const tracks = (playlist.tracks ?? []).map((t) => upsertTrack(t));
    return { ...playlist, tracks, providerName: provider.displayName };
  });
  if (!result.ok) return unavailable(res);
  res.json(result.data);
});

// ---------------------------------------------------------------------------
// Languages & Genres
// ---------------------------------------------------------------------------

browseRouter.get('/languages', (_req, res) => {
  res.json(getDb().prepare('SELECT * FROM languages ORDER BY id').all());
});

browseRouter.get('/languages/:id/tracks', async (req, res) => {
  const id = Number(req.params.id);
  const lang = getDb().prepare('SELECT * FROM languages WHERE id = ?').get(id) as { name: string } | undefined;
  if (!lang) return res.status(404).json({ error: 'not_found', message: 'Language not found.' });

  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const hits = await cached(provider.id, 'search', { language: lang.name, limit: 40 }, () =>
      provider.search({ query: lang.name, type: 'song', limit: 40 }),
    );
    return hits.tracks.map((t) => upsertTrack(t)).slice(0, 40);
  });
  if (!result.ok) return unavailable(res);
  res.json({ language: lang.name, tracks: result.data });
});

browseRouter.get('/genres', (_req, res) => {
  res.json(getDb().prepare('SELECT * FROM genres ORDER BY id').all());
});

browseRouter.get('/genres/:slug/tracks', async (req, res) => {
  const genre = getDb().prepare('SELECT * FROM genres WHERE slug = ?').get(req.params.slug) as { name: string; slug: string } | undefined;
  if (!genre) return res.status(404).json({ error: 'not_found', message: 'Genre not found.' });

  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const hits = await cached(provider.id, 'search', { genre: genre.slug, limit: 40 }, () =>
      provider.search({ query: genre.name, type: 'song', limit: 40 }),
    );
    return hits.tracks.map((t) => upsertTrack(t)).slice(0, 40);
  });
  if (!result.ok) return unavailable(res);
  res.json({ genre: genre.name, slug: genre.slug, tracks: result.data });
});

// ---------------------------------------------------------------------------
// Radio
// ---------------------------------------------------------------------------

browseRouter.get('/radio', (_req, res) => {
  res.json({ stations: listRadioStations() });
});

browseRouter.get('/radio/:id', (req, res) => {
  const station = getRadioStation(Number(req.params.id));
  if (!station) return res.status(404).json({ error: 'not_found', message: 'Radio station not found.' });
  res.json({ station });
});

browseRouter.get('/radio/:id/tracks', async (req, res) => {
  const station = getRadioStation(Number(req.params.id));
  if (!station) return res.status(404).json({ error: 'not_found', message: 'Radio station not found.' });
  const result = await withProvider(async () => radioTracks(station, 30));
  if (!result.ok) return unavailable(res);
  res.json({ station, tracks: result.data });
});

browseRouter.post('/radio/track/:songId', async (req, res) => {
  const track = getSongById(Number(req.params.songId));
  if (!track) return res.status(404).json({ error: 'not_found', message: 'Track not found.' });
  const result = await withProvider(async () => trackRadio(track, 20));
  if (!result.ok) return unavailable(res);
  res.json({ tracks: result.data });
});

// ---------------------------------------------------------------------------
// Featured playlists (internal "editorial" mixes)
// ---------------------------------------------------------------------------

/** Public list of featured/editorial playlists (no provider calls needed). */
browseRouter.get('/featured', (_req, res) => {
  res.json({ featured: getDb().prepare('SELECT * FROM featured_playlists WHERE enabled = 1 ORDER BY sort ASC').all() });
});

/** Ingest a provider track (e.g. from browser-fallback providers) into the catalog. */
browseRouter.post('/tracks/ingest', (req, res) => {
  const t = req.body?.track as Partial<Track> | undefined;
  if (!t || typeof t.title !== 'string' || typeof t.artistName !== 'string') {
    return res.status(400).json({ error: 'validation', message: 'A track with title and artist is required.' });
  }
  const provider = typeof t.provider === 'string' ? t.provider : 'unknown';
  const providerTrackId = typeof t.providerTrackId === 'string' ? t.providerTrackId : `${provider}:${t.title}:${t.artistName}`;
  const track: Track = {
    ...(t as Track),
    provider,
    providerTrackId,
    stream: t.stream ?? { kind: 'unavailable', isPreview: false, providerTrackId, attribution: 'No stream metadata was provided.' },
  };
  try {
    const saved = upsertTrack(track);
    res.json({ track: saved });
  } catch {
    res.status(400).json({ error: 'invalid_track', message: 'Could not save this track to the catalog.' });
  }
});

browseRouter.get('/featured/:id', async (req, res) => {
  const db = getDb();
  const featured = db.prepare('SELECT * FROM featured_playlists WHERE id = ?').get(Number(req.params.id)) as
    | { id: number; title: string; subtitle: string | null; cover_url: string | null; seed: string; provider: string }
    | undefined;
  if (!featured) return res.status(404).json({ error: 'not_found', message: 'Featured playlist not found.' });
  let seed: Record<string, unknown> = {};
  try { seed = JSON.parse(featured.seed ?? '{}'); } catch { seed = {}; }
  const result = await withProvider(async () => {
    const { provider } = await resolveProvider('stream');
    const query = String(seed.query ?? featured.title);
    const hits = await cached(provider.id, 'search', { featured: featured.id, query, limit: 30 }, () =>
      provider.search({ query, type: 'song', limit: 30 }),
    );
    return hits.tracks.map((t) => upsertTrack(t)).slice(0, 30);
  });
  if (!result.ok) return unavailable(res);
  res.json({ featured: { ...featured, seed }, tracks: result.data });
});

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

browseRouter.get('/recommendations/for-you', async (req, res) => {
  const result = await recommendationsForUser(req.user?.id, 24);
  res.json(result);
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

browseRouter.get('/browse/languages', (_req, res) => {
  res.json(getDb().prepare('SELECT * FROM languages ORDER BY id').all());
});
