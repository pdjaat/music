import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { getDb } from '../db/index.js';
import { getSongById, upsertTrack } from '../services/catalog.js';
import { Track } from '../providers/types.js';
import {
  likedSongs, likedSongIds, likeSong, unlikeSong, recentlyPlayed, recordListening, recordRecentlyPlayed, userProfile,
} from '../services/library.js';
import {
  createPlaylist, listPlaylists, getPlaylistDetail, updatePlaylist, deletePlaylist,
  addTrackToPlaylist, removeSongFromPlaylist, reorderPlaylist, addSongToPlaylist,
} from '../services/playlists.js';

export const libraryRouter = Router();
libraryRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Liked songs
// ---------------------------------------------------------------------------

libraryRouter.get('/liked', (req, res) => {
  res.json({ tracks: likedSongs(req.user!.id), ids: [...likedSongIds(req.user!.id)] });
});

libraryRouter.put('/liked/:songId', (req, res) => {
  const songId = Number(req.params.songId);
  if (!getSongById(songId)) return res.status(404).json({ error: 'not_found', message: 'Song not found.' });
  likeSong(req.user!.id, songId);
  res.json({ liked: true });
});

libraryRouter.delete('/liked/:songId', (req, res) => {
  unlikeSong(req.user!.id, Number(req.params.songId));
  res.json({ liked: false });
});

// ---------------------------------------------------------------------------
// Recently played & stats
// ---------------------------------------------------------------------------

libraryRouter.get('/recently-played', (req, res) => {
  res.json({ tracks: recentlyPlayed(req.user!.id, 50) });
});

libraryRouter.post('/history', (req, res) => {
  const songId = Number(req.body?.songId);
  const durationSec = Number(req.body?.durationSec ?? 0);
  const completed = Boolean(req.body?.completed);
  const track = getSongById(songId);
  if (!track) return res.status(404).json({ error: 'not_found', message: 'Song not found.' });
  recordRecentlyPlayed(req.user!.id, songId);
  if (durationSec > 5 || completed) recordListening(req.user!.id, songId, durationSec, completed);
  res.json({ ok: true });
});

libraryRouter.get('/stats', (req, res) => {
  res.json(userProfile(req.user!.id));
});

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

const playlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  coverUrl: z.string().url().max(1000).optional().or(z.literal('')),
});

libraryRouter.get('/playlists', (req, res) => {
  res.json({ playlists: listPlaylists(req.user!.id) });
});

libraryRouter.post('/playlists', (req, res) => {
  const parsed = playlistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'A playlist needs a name (max 100 chars).' });
  const pl = createPlaylist(req.user!.id, parsed.data.name, parsed.data.description);
  res.status(201).json({ playlist: pl });
});

libraryRouter.get('/playlists/:id', (req, res) => {
  const pl = getPlaylistDetail(Number(req.params.id));
  if (!pl) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  const owner = getDbOwner(Number(req.params.id));
  if (owner !== req.user!.id && !pl.isPublic) {
    return res.status(403).json({ error: 'forbidden', message: 'This playlist is private.' });
  }
  const liked = likedSongIds(req.user!.id);
  res.json({ playlist: { ...pl, tracks: pl.tracks.map((t) => ({ ...t, liked: liked.has(t.id) })) } });
});

libraryRouter.patch('/playlists/:id', (req, res) => {
  const id = Number(req.params.id);
  const owner = getDbOwner(id);
  if (!owner || owner !== req.user!.id) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  const parsed = playlistSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid playlist update.' });
  const updated = updatePlaylist(id, {
    name: parsed.data.name,
    description: parsed.data.description,
    isPublic: parsed.data.isPublic,
    coverUrl: parsed.data.coverUrl || undefined,
  });
  res.json({ playlist: updated });
});

libraryRouter.delete('/playlists/:id', (req, res) => {
  const id = Number(req.params.id);
  const owner = getDbOwner(id);
  if (!owner || owner !== req.user!.id) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  deletePlaylist(id);
  res.json({ ok: true });
});

const addSongSchema = z.object({
  // songId optional when a full track object is provided (browser-fallback flows).
  songId: z.number().int().positive().optional(),
  track: z.any().optional(),
});

libraryRouter.post('/playlists/:id/songs', (req, res) => {
  const id = Number(req.params.id);
  const owner = getDbOwner(id);
  if (!owner || owner !== req.user!.id) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  const parsed = addSongSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Provide a songId (or a full track).' });

  if (!parsed.data.songId && !parsed.data.track) {
    return res.status(400).json({ error: 'validation', message: 'Provide a songId (or a full track).' });
  }

  if (parsed.data.track && (!parsed.data.songId || !getSongById(parsed.data.songId))) {
    // Browser-fallback tracks aren't persisted yet — save them first.
    const t = parsed.data.track as Track;
    try {
      const saved = upsertTrack(t);
      const added = addSongToPlaylist(id, saved.id);
      return res.json({ added, songId: saved.id });
    } catch {
      return res.status(400).json({ error: 'invalid_track', message: 'Could not save this track to the catalog.' });
    }
  }
  if (!getSongById(parsed.data.songId!)) return res.status(404).json({ error: 'not_found', message: 'Song not found in catalog.' });
  const added = addSongToPlaylist(id, parsed.data.songId!);
  res.json({ added, songId: parsed.data.songId });
});

libraryRouter.delete('/playlists/:id/songs/:songId', (req, res) => {
  const id = Number(req.params.id);
  const owner = getDbOwner(id);
  if (!owner || owner !== req.user!.id) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  removeSongFromPlaylist(id, Number(req.params.songId));
  res.json({ ok: true });
});

const reorderSchema = z.object({ orderedIds: z.array(z.number().int().positive()).min(1) });

libraryRouter.post('/playlists/:id/reorder', (req, res) => {
  const id = Number(req.params.id);
  const owner = getDbOwner(id);
  if (!owner || owner !== req.user!.id) return res.status(404).json({ error: 'not_found', message: 'Playlist not found.' });
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Provide an ordered list of song ids.' });
  reorderPlaylist(id, parsed.data.orderedIds);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------

function getDbOwner(playlistId: number): number | null {
  const row = getDb().prepare('SELECT user_id FROM playlists WHERE id = ?').get(playlistId) as { user_id: number } | undefined;
  return row?.user_id ?? null;
}
