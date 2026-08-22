import 'dotenv/config';

function int(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int(process.env.PORT, 4000),
  // Absolute path is computed lazily so tests can override the db file.
  dataDir: process.env.DATA_DIR ?? (process.env.NODE_ENV === 'test' ? './data-test' : './data'),
  jwtSecret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  // YouTube Data API v3 key (search/discovery). Playback via the IFrame API needs no key.
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  // Primary provider id, configurable without code changes.
  primaryProvider: process.env.MUSIC_PROVIDER_PRIMARY ?? 'youtube',
  fallbackProvider: process.env.MUSIC_PROVIDER_FALLBACK ?? 'internetarchive',
  // Request timeouts for upstream providers (ms). Kept short so a dead provider fails fast.
  providerTimeoutMs: int(process.env.PROVIDER_TIMEOUT_MS, 3500),
  // Cache TTL defaults (seconds) — admin can override per provider via refresh intervals.
  cacheTtl: {
    search: int(process.env.CACHE_SEARCH_S, 60 * 60 * 6),
    trending: int(process.env.CACHE_TRENDING_S, 60 * 60),
    newReleases: int(process.env.CACHE_NEW_S, 60 * 60),
    detail: int(process.env.CACHE_DETAIL_S, 60 * 60 * 24),
    radio: int(process.env.CACHE_RADIO_S, 60 * 30),
  },
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? '',
  // Rate limit for public API (requests per window).
  rateLimit: { windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 60_000), max: int(process.env.RATE_LIMIT_MAX, 300) },
  clientOrigin: process.env.CLIENT_ORIGIN ?? '*',
} as const;

export function requireSecret(): string {
  if (!config.jwtSecret || config.jwtSecret === 'dev-only-insecure-secret-change-me') {
    if (config.env === 'production') {
      throw new Error('AUTH_SECRET must be set in production');
    }
  }
  return config.jwtSecret;
}
