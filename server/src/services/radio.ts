import { getDb } from '../db/index.js';
import { cached } from './cache.js';
import { resolveProvider } from '../providers/index.js';
import { RadioStation, Track } from '../providers/types.js';
import { upsertTrack, DbTrack } from './catalog.js';

export interface RadioStationRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  artworkUrl: string | null;
  provider: string | null;
  seed: Record<string, unknown>;
  enabled: boolean;
  sort: number;
}

export function listRadioStations(): RadioStationRow[] {
  const rows = getDb().prepare(
    'SELECT * FROM radio_stations WHERE enabled = 1 ORDER BY sort ASC, name ASC',
  ).all() as Array<{
    id: number; slug: string; name: string; description: string | null; artwork_url: string | null;
    provider: string | null; seed: string; enabled: number; sort: number;
  }>;
  return rows.map((r) => {
    let seed: Record<string, unknown> = {};
    try { seed = JSON.parse(r.seed ?? '{}'); } catch { seed = {}; }
    return { id: r.id, slug: r.slug, name: r.name, description: r.description, artworkUrl: r.artwork_url, provider: r.provider, seed, enabled: Boolean(r.enabled), sort: r.sort };
  });
}

export function getRadioStation(id: number): RadioStationRow | null {
  return listRadioStations().find((s) => s.id === id) ?? null;
}

export function createRadioStation(input: { slug: string; name: string; description?: string; seed: Record<string, unknown>; sort?: number }): void {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO radio_stations (slug, name, description, provider, seed, sort) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.slug, input.name, input.description ?? null, 'auto', JSON.stringify(input.seed), input.sort ?? 0);
}

export function updateRadioStation(id: number, patch: { name?: string; description?: string; seed?: Record<string, unknown>; enabled?: boolean; sort?: number }): void {
  const db = getDb();
  const sets: string[] = [];
  const vals: Array<string | number | null> = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.description !== undefined) { sets.push('description = ?'); vals.push(patch.description); }
  if (patch.seed !== undefined) { sets.push('seed = ?'); vals.push(JSON.stringify(patch.seed)); }
  if (patch.enabled !== undefined) { sets.push('enabled = ?'); vals.push(patch.enabled ? 1 : 0); }
  if (patch.sort !== undefined) { sets.push('sort = ?'); vals.push(patch.sort); }
  if (sets.length) {
    vals.push(id);
    getDb().prepare(`UPDATE radio_stations SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
}

export function deleteRadioStation(id: number): void {
  getDb().prepare('DELETE FROM radio_stations WHERE id = ?').run(id);
}

/** Fetch tracks for a radio station from the active provider (cached). */
export async function radioTracks(station: RadioStationRow, limit = 30): Promise<DbTrack[]> {
  const { provider } = await resolveProvider('stream');
  const seed = station.seed ?? {};
  const tracks = await cached(provider.id, 'radio', { station: station.slug, limit }, () =>
    provider.getRadioTracks({ id: station.id, slug: station.slug, name: station.name, description: station.description ?? undefined, artworkUrl: station.artworkUrl ?? undefined, provider: provider.id, seed } as RadioStation, limit),
  );
  return tracks.map((t) => upsertTrack(t));
}

/** Track radio: build a continuous stream of similar/related tracks. */
export async function trackRadio(track: Track, limit = 20): Promise<DbTrack[]> {
  const { provider } = await resolveProvider('stream');
  const query = `${track.artistName} ${track.title}`.trim();
  const hits = await cached(provider.id, 'search', { trackRadio: query, limit }, () =>
    provider.search({ query, type: 'song', limit: limit * 2 }),
  );
  // Prefer tracks that are similar (same artist first, then others).
  const sorted = [...hits.tracks].sort((a, b) => {
    const aSame = a.artistName.toLowerCase() === track.artistName.toLowerCase() ? 0 : 1;
    const bSame = b.artistName.toLowerCase() === track.artistName.toLowerCase() ? 0 : 1;
    return aSame - bSame;
  });
  const unique = sorted.filter((t) => t.providerTrackId !== track.providerTrackId).slice(0, limit);
  return unique.map((t) => upsertTrack(t));
}
