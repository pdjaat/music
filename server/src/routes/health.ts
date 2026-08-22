import { Router } from 'express';
import { allProviders } from '../providers/index.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ ok: true, service: 'sangeet-api', time: new Date().toISOString() });
});

healthRouter.get('/providers', async (_req, res) => {
  const out = [];
  for (const p of allProviders) {
    try {
      const h = await p.health();
      out.push(h);
    } catch (e) {
      out.push({ provider: p.id, configured: p.isConfigured(), reachable: false, checkedAt: new Date().toISOString(), message: e instanceof Error ? e.message : 'unknown' });
    }
  }
  res.json({ providers: out });
});
