import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { config } from '../config.js';

/**
 * Thin data-access layer over Node's built-in SQLite (node:sqlite).
 * The schema is intentionally portable — the same DDL maps 1:1 to
 * PostgreSQL (see docs/DATABASE.md for the migration path).
 *
 * node:sqlite is loaded at runtime so bundlers / test runners never try to
 * resolve it as a module.
 */

type DatabaseSync = import('node:sqlite').DatabaseSync;

function loadSqlite(): typeof import('node:sqlite') {
  const gbm = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
  if (gbm) return gbm('node:sqlite') as typeof import('node:sqlite');
  // Fallback for older Node versions.
  return createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
}

const { DatabaseSync } = loadSqlite();

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (config.env !== 'test') {
    fs.mkdirSync(config.dataDir, { recursive: true });
  } else {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  const file = path.join(config.dataDir, 'sangeet.db');
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  applySchema(db);
  return db;
}

/** Open an in-memory database (used by tests). */
export function openMemoryDb(): DatabaseSync {
  const mem = new DatabaseSync(':memory:');
  mem.exec('PRAGMA foreign_keys = ON;');
  applySchema(mem);
  return mem;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function applySchema(d: DatabaseSync): void {
  d.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    theme TEXT NOT NULL DEFAULT 'dark',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_native TEXT
  );

  CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_native TEXT
  );

  CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    image_url TEXT,
    bio TEXT,
    UNIQUE(normalized_name)
  );

  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    artist_id INTEGER REFERENCES artists(id),
    artist_name TEXT,
    cover_url TEXT,
    release_date TEXT,
    UNIQUE(normalized_title, artist_id)
  );

  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    normalized_artist TEXT NOT NULL,
    artist_id INTEGER REFERENCES artists(id),
    album_id INTEGER REFERENCES albums(id),
    album_name TEXT,
    artwork_url TEXT,
    duration_sec INTEGER,
    release_date TEXT,
    year INTEGER,
    language TEXT,
    is_explicit INTEGER NOT NULL DEFAULT 0,
    popularity INTEGER NOT NULL DEFAULT 0,
    lyrics TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(normalized_title, normalized_artist)
  );

  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    kind TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    config TEXT NOT NULL DEFAULT '{}',
    last_health TEXT,
    last_checked_at TEXT
  );

  CREATE TABLE IF NOT EXISTS provider_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    provider_track_id TEXT NOT NULL,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    stream_url TEXT,
    video_id TEXT,
    stream_kind TEXT NOT NULL,
    is_preview INTEGER NOT NULL DEFAULT 1,
    license TEXT,
    attribution TEXT,
    provider_page_url TEXT,
    stream_expires_at TEXT,
    metadata TEXT,
    UNIQUE(provider_id, provider_track_id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(playlist_id, position),
    UNIQUE(playlist_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS liked_songs (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS recently_played (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_sec INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS radio_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    artwork_url TEXT,
    provider TEXT,
    seed TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS provider_cache (
    key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS search_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    user_id INTEGER,
    results INTEGER NOT NULL DEFAULT 0,
    provider TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS featured_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT,
    cover_url TEXT,
    provider TEXT NOT NULL DEFAULT 'internal',
    provider_playlist_id TEXT,
    seed TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_songs_norm ON songs(normalized_title, normalized_artist);
  CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_pt_song ON provider_tracks(song_id);
  CREATE INDEX IF NOT EXISTS idx_ps_playlist ON playlist_songs(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_hist_user ON listening_history(user_id, played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_rp_user ON recently_played(user_id, played_at DESC);
  CREATE INDEX IF NOT EXISTS idx_events_created ON admin_events(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_search_created ON search_log(created_at DESC);
  `);
}

export type Row = Record<string, unknown>;

/** Run `fn` inside a transaction (node:sqlite has no .transaction helper). */
export function withTransaction(d: DatabaseSync, fn: () => void): void {
  d.exec('BEGIN');
  try {
    fn();
    d.exec('COMMIT');
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export type SqlValue = string | number | null | bigint | Uint8Array;
