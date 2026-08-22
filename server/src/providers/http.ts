import { config } from '../config.js';
import { ProviderError } from './types.js';

/**
 * Small HTTP helper with timeouts + retries. Every upstream call goes through
 * here so we can guarantee: short timeouts, bounded retries, typed failures,
 * and no raw upstream exceptions leaking into responses.
 */

export interface HttpOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** Optional JSON body for POST. */
  body?: unknown;
  /** Timeout in ms (defaults to config.providerTimeoutMs). */
  timeoutMs?: number;
  /** Number of retries on network errors (not on 4xx). */
  retries?: number;
  /** Cache key (server-side short TTL) used by callers, if any. */
  cacheKey?: string;
}

const MAX_BODY = 4 * 1024 * 1024;

export async function httpGetJson<T = unknown>(url: string, opts: HttpOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = config.providerTimeoutMs, retries = 1 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let attempt = 0;
  try {
    for (;;) {
      attempt += 1;
      try {
        const res = await fetch(url, {
          method,
          headers: { Accept: 'application/json', 'User-Agent': 'Sangeet/1.0 (+https://github.com/pdjaat/music)', ...headers },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 429 || res.status === 403) {
            throw new ProviderError('RATE_LIMITED', `Rate limited by upstream (${res.status}). Please retry shortly.`);
          }
          if (res.status === 404) throw new ProviderError('NOT_FOUND', 'Not found at upstream provider.');
          if (res.status >= 500) {
            if (attempt <= retries) {
              await sleep(300 * attempt);
              continue;
            }
            throw new ProviderError('UNAVAILABLE', `Upstream provider returned HTTP ${res.status}.`);
          }
          throw new ProviderError('UNAVAILABLE', `Upstream provider returned HTTP ${res.status}.`);
        }
        const text = await res.text();
        if (text.length > MAX_BODY) throw new ProviderError('INVALID_RESPONSE', 'Upstream response too large.');
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new ProviderError('INVALID_RESPONSE', 'Upstream returned non-JSON response.');
        }
      } catch (e) {
        if (e instanceof ProviderError) {
          if (e.code === 'RATE_LIMITED') throw e;
          if (attempt <= retries && (e.code === 'UNAVAILABLE' || e.code === 'TIMEOUT')) continue;
          throw e;
        }
        if (attempt <= retries) {
          await sleep(300 * attempt);
          continue;
        }
        if (e instanceof Error && e.name === 'AbortError') {
          throw new ProviderError('TIMEOUT', 'Upstream provider timed out.');
        }
        throw new ProviderError('UNAVAILABLE', `Network error reaching upstream: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Best-effort URL builder. */
export function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
