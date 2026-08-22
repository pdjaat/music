import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../auth/middleware.js';
import { adminStats, logEvent, recentEvents, searchTrends, recentContent } from '../services/admin.js';
import { providerList, setProviderConfig, allProviders, getProvider } from '../providers/index.js';
import { clearCache } from '../services/cache.js';
import { getDb } from '../db/index.js';
import { createRadioStation, deleteRadioStation, listRadioStations, updateRadioStation } from '../services/radio.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/stats', (_req, res) => {
  res.json(adminStats());
});

adminRouter.get('/providers', async (_req, res) => {
  const providers = await providerList();
  res.json({ providers });
});

const providerPatchSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  config: z.record(z.unknown()).optional(),
});

adminRouter.patch('/providers/:id', (req, res) => {
  const provider = getProvider(req.params.id);
  if (!provider) return res.status(404).json({ error: 'not_found', message: 'Unknown provider.' });
  const parsed = providerPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid provider settings.' });
  setProviderConfig(provider.id, parsed.data);
  logEvent('admin', `Provider ${provider.id} settings updated`, parsed.data);
  res.json({ ok: true });
});

adminRouter.post('/cache/clear', (_req, res) => {
  clearCache();
  res.json({ ok: true });
});

adminRouter.get('/events', (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 200);
  res.json({ events: recentEvents(limit) });
});

adminRouter.get('/search-trends', (_req, res) => {
  res.json({ trends: searchTrends(20) });
});

adminRouter.get('/content/recent', (_req, res) => {
  res.json({ content: recentContent(30) });
});

// ---- Featured playlists management ----

adminRouter.get('/featured', (_req, res) => {
  res.json({ featured: getDb().prepare('SELECT * FROM featured_playlists ORDER BY sort ASC').all() });
});

const featuredSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(300).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  seed: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().optional(),
});

adminRouter.post('/featured', (req, res) => {
  const parsed = featuredSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'A featured playlist needs a title.' });
  const db = getDb();
  const info = db.prepare('INSERT INTO featured_playlists (title, subtitle, cover_url, seed, sort) VALUES (?, ?, ?, ?, ?)')
    .run(parsed.data.title, parsed.data.subtitle ?? null, parsed.data.coverUrl || null, JSON.stringify(parsed.data.seed ?? {}), parsed.data.sort ?? 0);
  logEvent('admin', `Featured playlist "${parsed.data.title}" created`);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

adminRouter.patch('/featured/:id', (req, res) => {
  const parsed = featuredSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid featured playlist update.' });
  const db = getDb();
  const sets: string[] = [];
  const vals: Array<string | number | null> = [];
  if (parsed.data.title !== undefined) { sets.push('title = ?'); vals.push(parsed.data.title); }
  if (parsed.data.subtitle !== undefined) { sets.push('subtitle = ?'); vals.push(parsed.data.subtitle); }
  if (parsed.data.coverUrl !== undefined) { sets.push('cover_url = ?'); vals.push(parsed.data.coverUrl || null); }
  if (parsed.data.seed !== undefined) { sets.push('seed = ?'); vals.push(JSON.stringify(parsed.data.seed)); }
  if (parsed.data.enabled !== undefined) { sets.push('enabled = ?'); vals.push(parsed.data.enabled ? 1 : 0); }
  if (parsed.data.sort !== undefined) { sets.push('sort = ?'); vals.push(parsed.data.sort); }
  if (sets.length) {
    vals.push(Number(req.params.id));
    db.prepare(`UPDATE featured_playlists SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    logEvent('admin', `Featured playlist #${req.params.id} updated`);
  }
  res.json({ ok: true });
});

adminRouter.delete('/featured/:id', (req, res) => {
  getDb().prepare('DELETE FROM featured_playlists WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---- Radio stations management ----

const radioSchema = z.object({
  slug: z.string().min(1).max(60),
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  seed: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
  sort: z.number().int().optional(),
});

adminRouter.get('/radio', (_req, res) => {
  res.json({ stations: listRadioStations() });
});

adminRouter.post('/radio', (req, res) => {
  const parsed = radioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'A radio station needs a slug and name.' });
  createRadioStation({ slug: parsed.data.slug, name: parsed.data.name, description: parsed.data.description, seed: parsed.data.seed ?? {}, sort: parsed.data.sort });
  logEvent('admin', `Radio station "${parsed.data.name}" created`);
  res.status(201).json({ ok: true });
});

adminRouter.patch('/radio/:id', (req, res) => {
  const parsed = radioSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid radio station update.' });
  updateRadioStation(Number(req.params.id), parsed.data);
  res.json({ ok: true });
});

adminRouter.delete('/radio/:id', (req, res) => {
  deleteRadioStation(Number(req.params.id));
  res.json({ ok: true });
});

// ---- Misc ----

adminRouter.get('/providers-raw', (_req, res) => {
  res.json({ providers: allProviders.map((p) => ({ id: p.id, displayName: p.displayName, kind: p.kind, configured: p.isConfigured() })) });
});
