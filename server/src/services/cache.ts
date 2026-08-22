import { getDb } from '../db/index.js';
import { providerState } from '../providers/index.js';
import { isProviderError, ProviderError } from '../providers/types.js';

/**
 * Provider-response cache.
 *
 * Persisted in SQLite so the cache survives restarts. TTLs come from the
 * per-endpoint defaults in config, but an admin can override the refresh
 * interval per provider (providers.config.refreshIntervalSec) — that value
 * becomes the TTL for that provider's catalog calls.
 */

const memory = new Map<string, { payload: string; expiresAt: number }>();
// Negative cache: provider keys that recently failed, so a dead provider is
// not re-attempted on every single request (expires after 60s).
const failureMemory = new Map<string, number>();

function ttlFor(provider: string, endpoint: string): number {
  const refresh = Number(providerState(provider).config.refreshIntervalSec ?? 0);
  if (refresh > 0) return refresh;
  const defaults: Record<string, number> = {
    search: 6 * 3600,
    trending: 3600,
    newReleases: 3600,
    detail: 24 * 3600,
    radio: 1800,
  };
  return defaults[endpoint] ?? 3600;
}

export function cacheKey(provider: string, endpoint: string, params: unknown): string {
  return `${provider}:${endpoint}:${JSON.stringify(params)}`;
}

export function cacheGet<T>(key: string): T | null {
  const now = Date.now();
  const memHit = memory.get(key);
  if (memHit && memHit.expiresAt > now) {
    try { return JSON.parse(memHit.payload) as T; } catch { /* fallthrough */ }
  }
  const db = getDb();
  const row = db.prepare('SELECT payload, expires_at FROM provider_cache WHERE key = ?').get(key) as { payload: string; expires_at: string } | undefined;
  if (!row) return null;
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt <= now) {
    db.prepare('DELETE FROM provider_cache WHERE key = ?').run(key);
    return null;
  }
  memory.set(key, { payload: row.payload, expiresAt });
  try { return JSON.parse(row.payload) as T; } catch { return null; }
}

export function cacheSet<T>(key: string, value: T, ttlSec?: number): void {
  const expiresAt = Date.now() + (ttlSec ?? 3600) * 1000;
  const payload = JSON.stringify(value);
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO provider_cache (key, payload, expires_at) VALUES (?, ?, ?)')
    .run(key, payload, new Date(expiresAt).toISOString());
  memory.set(key, { payload, expiresAt });
}

/**
 * Run `fn` and cache the result under `key` for the given provider/endpoint TTL.
 * Unavailability/timeouts are negative-cached for 60s so a dead provider
 * doesn't stall every request with network timeouts.
 */
export async function cached<T>(provider: string, endpoint: string, keySuffix: unknown, fn: () => Promise<T>, ttlSec?: number): Promise<T> {
  const key = cacheKey(provider, endpoint, keySuffix);
  const failure = failureMemory.get(key);
  if (failure && failure > Date.now()) {
    throw new ProviderError('UNAVAILABLE', 'Provider is temporarily unavailable (recent failure).');
  }
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  try {
    const value = await fn();
    cacheSet(key, value, ttlSec ?? ttlFor(provider, endpoint));
    return value;
  } catch (e) {
    if (isProviderError(e) && (e.code === 'UNAVAILABLE' || e.code === 'TIMEOUT' || e.code === 'NOT_CONFIGURED')) {
      failureMemory.set(key, Date.now() + 60_000);
    }
    throw e;
  }
}

export function cacheStats(): { hits: number; memoryEntries: number } {
  return { hits: 0, memoryEntries: memory.size };
}

export function clearCache(): void {
  memory.clear();
  getDb().prepare('DELETE FROM provider_cache').run();
}
