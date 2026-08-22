import cors from 'cors';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { authenticate } from './auth/middleware.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { rateLimit } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { browseRouter } from './routes/browse.js';
import { libraryRouter } from './routes/library.js';
import { adminRouter } from './routes/admin.js';
import { providersRouter } from './routes/providers.js';
import { healthRouter } from './routes/health.js';
import { seedDb } from './db/seed.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.clientOrigin === '*' ? true : config.clientOrigin.split(','), credentials: false }));
  app.use(express.json({ limit: '256kb' }));
  app.use(rateLimit);
  app.use(authenticate);

  // Pre-seed lookups (languages, genres, radio stations, providers, featured).
  seedDb();

  // Serve the built web client when present (production deployment).
  // Resolved relative to THIS module so it works from any working directory
  // (server/dist/app.js -> ../.. = repo root -> web/dist).
  // Registered BEFORE the API routes so "/" and client-side routes (e.g.
  // /search) serve the app in production; /api paths are excluded and still
  // fall through to the API routes below.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(here, '..', '..', 'web', 'dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.get('/', (_req, res) => res.json({ name: 'Sangeet API', docs: '/api/health' }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', browseRouter);
  app.use('/api/me', libraryRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/providers', providersRouter);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
