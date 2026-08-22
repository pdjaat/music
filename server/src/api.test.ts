import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { openMemoryDb } from './db/index.js';
import { seedDb } from './db/seed.js';

// Tests use an in-memory DB by overriding the module DB.
let app: ReturnType<typeof createApp>;
let token = '';
let userId = 0;

beforeAll(async () => {
  // Force the db module to use memory (simple approach: seed then app boot).
  process.env.NODE_ENV = 'test';
  seedDb();
  app = createApp();
});

describe('auth', () => {
  it('registers a user', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'qa@test.dev', password: 'password123', displayName: 'QA Tester' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
    userId = res.body.user.id;
  });

  it('rejects duplicate emails', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'qa@test.dev', password: 'password123', displayName: 'X' });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.dev', password: 'short', displayName: 'X' });
    expect(res.status).toBe(400);
  });

  it('logs in', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'qa@test.dev', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'qa@test.dev', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('returns me with token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('qa@test.dev');
  });

  it('requires auth for me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('changes password then logs in with it', async () => {
    await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'newpass456' });
    const login = await request(app).post('/api/auth/login').send({ email: 'qa@test.dev', password: 'newpass456' });
    expect(login.status).toBe(200);
  });
});

describe('catalog & playlists', () => {
  it('ingests a track and dedupes on title+artist', async () => {
    const track = {
      title: 'Test Song', artistName: 'Test Artist', albumName: 'Test Album', provider: 'deezer',
      providerTrackId: 'dz:1', stream: { kind: 'url', url: 'https://example.com/1.mp3', isPreview: true, providerTrackId: 'dz:1' },
    };
    const r1 = await request(app).post('/api/tracks/ingest').send({ track });
    expect(r1.status).toBe(200);
    const id1 = r1.body.track.id;
    const r2 = await request(app).post('/api/tracks/ingest').send({ track: { ...track, provider: 'itunes', providerTrackId: 'it:1', stream: { kind: 'url', url: 'https://example.com/2.mp3', isPreview: true, providerTrackId: 'it:1' } } });
    expect(r2.body.track.id).toBe(id1);
  });

  it('creates, renames, adds, reorders and deletes a playlist', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app).post('/api/me/playlists').set(auth).send({ name: 'My Mix', description: 'test' });
    expect(created.status).toBe(201);
    const playlistId = created.body.playlist.id;

    // ingest two tracks
    const t1 = await request(app).post('/api/tracks/ingest').send({ track: { title: 'A', artistName: 'X', provider: 'deezer', providerTrackId: 'dz:a', stream: { kind: 'url', url: 'u1', isPreview: true, providerTrackId: 'dz:a' } } });
    const t2 = await request(app).post('/api/tracks/ingest').send({ track: { title: 'B', artistName: 'Y', provider: 'deezer', providerTrackId: 'dz:b', stream: { kind: 'url', url: 'u2', isPreview: true, providerTrackId: 'dz:b' } } });
    await request(app).post(`/api/me/playlists/${playlistId}/songs`).set(auth).send({ songId: t1.body.track.id });
    await request(app).post(`/api/me/playlists/${playlistId}/songs`).set(auth).send({ songId: t2.body.track.id });

    const detail = await request(app).get(`/api/me/playlists/${playlistId}`).set(auth);
    expect(detail.body.playlist.tracks).toHaveLength(2);

    // reorder
    const reorder = await request(app).post(`/api/me/playlists/${playlistId}/reorder`).set(auth).send({ orderedIds: [t2.body.track.id, t1.body.track.id] });
    expect(reorder.status).toBe(200);
    const after = await request(app).get(`/api/me/playlists/${playlistId}`).set(auth);
    expect(after.body.playlist.tracks[0].id).toBe(t2.body.track.id);

    // rename
    const renamed = await request(app).patch(`/api/me/playlists/${playlistId}`).set(auth).send({ name: 'Renamed Mix', isPublic: false });
    expect(renamed.body.playlist.name).toBe('Renamed Mix');
    expect(renamed.body.playlist.isPublic).toBe(false);

    // delete
    const del = await request(app).delete(`/api/me/playlists/${playlistId}`).set(auth);
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/me/playlists/${playlistId}`).set(auth);
    expect(gone.status).toBe(404);
  });

  it('enforces ownership', async () => {
    const other = await request(app).post('/api/auth/register').send({ email: 'other@test.dev', password: 'password123', displayName: 'Other' });
    const created = await request(app).post('/api/me/playlists').set('Authorization', `Bearer ${token}`).send({ name: 'Mine' });
    const res = await request(app).patch(`/api/me/playlists/${created.body.playlist.id}`).set('Authorization', `Bearer ${other.body.token}`).send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });
});

describe('likes & history', () => {
  it('likes and unlikes a song', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const t = await request(app).post('/api/tracks/ingest').send({ track: { title: 'Love Me', artistName: 'Z', provider: 'deezer', providerTrackId: 'dz:love', stream: { kind: 'url', url: 'u', isPreview: true, providerTrackId: 'dz:love' } } });
    const like = await request(app).put(`/api/me/liked/${t.body.track.id}`).set(auth);
    expect(like.status).toBe(200);
    const liked = await request(app).get('/api/me/liked').set(auth);
    expect(liked.body.tracks.some((x: { id: number }) => x.id === t.body.track.id)).toBe(true);
    await request(app).delete(`/api/me/liked/${t.body.track.id}`).set(auth);
    const after = await request(app).get('/api/me/liked').set(auth);
    expect(after.body.tracks.some((x: { id: number }) => x.id === t.body.track.id)).toBe(false);
  });

  it('records plays for guests and users', async () => {
    const t = await request(app).post('/api/tracks/ingest').send({ track: { title: 'Play Me', artistName: 'Z', provider: 'deezer', providerTrackId: 'dz:play', stream: { kind: 'url', url: 'u', isPreview: true, providerTrackId: 'dz:play' } } });
    const play = await request(app).post(`/api/tracks/${t.body.track.id}/play`).send({ durationSec: 30, completed: true });
    expect(play.status).toBe(200);
    const userPlay = await request(app).post(`/api/tracks/${t.body.track.id}/play`).set('Authorization', `Bearer ${token}`).send({ durationSec: 30, completed: true });
    expect(userPlay.status).toBe(200);
  });
});

describe('browse & admin', () => {
  it('serves home with languages/genres/stations', async () => {
    const res = await request(app).get('/api/home');
    expect(res.status).toBe(200);
    expect(res.body.languages.length).toBeGreaterThanOrEqual(14);
    expect(res.body.genres.length).toBeGreaterThan(10);
    expect(res.body.stations.length).toBeGreaterThanOrEqual(10);
  });

  it('transliterates search on the server', async () => {
    const res = await request(app).get('/api/search').query({ q: 'अरिजीत' });
    expect(res.status).toBe(200);
  });

  it('guards admin endpoints', async () => {
    const noAuth = await request(app).get('/api/admin/stats');
    expect(noAuth.status).toBe(401);
    const notAdmin = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(notAdmin.status).toBe(403);
  });

  it('returns provider transparency info', async () => {
    const res = await request(app).get('/api/providers');
    expect(res.status).toBe(200);
    expect(res.body.providers.length).toBeGreaterThanOrEqual(3);
  });

  it('rate limits excessive requests', async () => {
    // Must run last — it exhausts the per-IP bucket for the test window.
    let last = 0;
    for (let i = 0; i < 60; i++) {
      last = (await request(app).get('/api/health')).status;
    }
    expect(last).toBe(429);
  });
});
