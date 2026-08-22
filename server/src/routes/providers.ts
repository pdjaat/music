import { Router } from 'express';
import { providerList, allProviders, providerState } from '../providers/index.js';

export const providersRouter = Router();

/**
 * Public provider transparency page data — legal/attribution info.
 */
providersRouter.get('/', async (_req, res) => {
  const list = await providerList();
  res.json({
    providers: list.map((p) => {
      const state = providerState(p.id);
      return { ...p, config: state.config };
    }),
    note: 'Sangeet streams content through the official APIs of its providers. Content remains owned by its respective rights holders; Sangeet does not host, re-encode, or download any audio. Preview vs full streams are always labelled.',
  });
});

providersRouter.get('/raw', (_req, res) => {
  res.json({
    providers: allProviders.map((p) => ({ id: p.id, displayName: p.displayName, kind: p.kind, configured: p.isConfigured() })),
  });
});
