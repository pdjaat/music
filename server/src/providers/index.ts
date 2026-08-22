import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { InternetArchiveProvider } from './internetArchive.js';
import { MusicBrainzProvider } from './musicbrainz.js';
import { MusicProvider, ProviderError, ProviderListResult } from './types.js';
import { YouTubeProvider } from './youtube.js';

/**
 * Provider registry. Providers are enabled/disabled and prioritized from the
 * admin panel (persisted in the `providers` table). The registry resolves the
 * active provider for a given capability and fans out health checks.
 */

export const youtube = new YouTubeProvider();
export const internetArchive = new InternetArchiveProvider();
export const musicbrainz = new MusicBrainzProvider();

export const allProviders: MusicProvider[] = [youtube, internetArchive, musicbrainz];

export function getProvider(id: string): MusicProvider | undefined {
  return allProviders.find((p) => p.id === id);
}

export function providerState(id: string): { enabled: boolean; priority: number; config: Record<string, unknown> } {
  const db = getDb();
  const row = db.prepare('SELECT enabled, priority, config FROM providers WHERE id = ?').get(id) as
    | { enabled: number; priority: number; config: string }
    | undefined;
  if (!row) return { enabled: true, priority: 100, config: {} };
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(row.config ?? '{}'); } catch { parsed = {}; }
  return { enabled: Boolean(row.enabled), priority: row.priority, config: parsed };
}

export function isProviderEnabled(id: string): boolean {
  return providerState(id).enabled;
}

/** Ordered list of providers by priority (low number = higher priority). */
export function providersByPriority(): MusicProvider[] {
  return [...allProviders].sort((a, b) => {
    const pa = providerState(a.id).priority;
    const pb = providerState(b.id).priority;
    return pa - pb;
  });
}

/** The first enabled, configured provider of the given kind. */
export function activeStreamProvider(): MusicProvider {
  const enabled = providersByPriority().filter((p) => p.kind === 'stream' && isProviderEnabled(p.id));
  if (enabled.length === 0) {
    throw new ProviderError('UNAVAILABLE', 'No music provider is currently enabled. An administrator can enable one in the Admin panel.');
  }
  return enabled[0];
}

export function anyStreamProviderConfigured(): boolean {
  return providersByPriority().some((p) => p.kind === 'stream' && isProviderEnabled(p.id) && p.isConfigured());
}

export async function providerList(): Promise<ProviderListResult[]> {
  const out: ProviderListResult[] = [];
  for (const p of allProviders) {
    const state = providerState(p.id);
    let health;
    try { health = await p.health(); } catch { health = { provider: p.id, configured: p.isConfigured(), reachable: false, checkedAt: new Date().toISOString(), message: 'Unknown' }; }
    out.push({
      id: p.id,
      displayName: p.displayName,
      kind: p.kind,
      enabled: state.enabled,
      priority: state.priority,
      configured: p.isConfigured(),
      reachable: health.reachable,
      message: health.message,
    });
  }
  return out;
}

export interface Capability {
  provider: MusicProvider;
  usedFallback: boolean;
}

/**
 * Resolve a provider for a user-facing data request, honouring enable flags and
 * the configured primary. If the primary is unavailable (not configured or
 * failed), falls back to the next enabled provider.
 */
export async function resolveProvider(kind: 'stream' | 'metadata'): Promise<Capability> {
  const candidates = providersByPriority().filter((p) => p.kind === kind && isProviderEnabled(p.id));
  if (candidates.length === 0) {
    throw new ProviderError('UNAVAILABLE', 'No enabled provider is available for this content.');
  }
  const preferred = candidates.find((p) => p.id === config.primaryProvider) ?? candidates[0];
  if (preferred.isConfigured()) return { provider: preferred, usedFallback: false };
  const fallback = candidates.find((p) => p.id !== preferred.id && p.isConfigured());
  if (fallback) return { provider: fallback, usedFallback: true };
  return { provider: preferred, usedFallback: true };
}

export function setProviderConfig(id: string, patch: { enabled?: boolean; priority?: number; config?: Record<string, unknown> }): void {
  const db = getDb();
  const state = providerState(id);
  const next = {
    enabled: patch.enabled ?? state.enabled,
    priority: patch.priority ?? state.priority,
    config: { ...state.config, ...(patch.config ?? {}) },
  };
  db.prepare('UPDATE providers SET enabled = ?, priority = ?, config = ? WHERE id = ?')
    .run(next.enabled ? 1 : 0, next.priority, JSON.stringify(next.config), id);
}
