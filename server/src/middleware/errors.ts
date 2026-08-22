import { NextFunction, Request, Response } from 'express';
import { isProviderError } from '../providers/types.js';
import { logEvent } from '../services/admin.js';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'This endpoint does not exist.' });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Never leak raw backend/provider errors to normal users.
  if (isProviderError(err)) {
    logEvent('provider_error', err.message, { code: err.code });
    const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'RATE_LIMITED' ? 429 : 502;
    res.status(status).json({ error: err.code.toLowerCase(), message: friendly(err.code, err.message) });
    return;
  }

  // Body-parser errors (malformed JSON, oversized payload) → 400.
  const bodyErr = err as { type?: string; status?: number; statusCode?: number };
  if (bodyErr?.type === 'entity.parse.failed' || bodyErr?.type === 'entity.too.large') {
    res.status(400).json({ error: 'invalid_json', message: bodyErr.type === 'entity.too.large' ? 'Request body too large.' : 'Request body is not valid JSON.' });
    return;
  }

  logEvent('api_error', err instanceof Error ? err.message : 'unknown error', { path: req.path });
  console.error('[api-error]', req.method, req.path, err instanceof Error ? err.message : err);
  res.status(500).json({ error: 'internal', message: 'Something went wrong on our side. Please try again.' });
}

function friendly(code: string, fallback: string): string {
  const map: Record<string, string> = {
    NOT_CONFIGURED: 'This music source is not configured yet. An administrator can enable it.',
    RATE_LIMITED: 'The music source is rate-limiting requests right now. Please wait a moment and try again.',
    UNAVAILABLE: 'The music source is temporarily unavailable. Please try again in a moment.',
    TIMEOUT: 'The music source took too long to respond. Please try again.',
    REGION_RESTRICTED: 'This content is not available in your region.',
    INVALID_RESPONSE: 'The music source returned an unexpected response.',
    NOT_FOUND: 'This content could not be found.',
  };
  return map[code] ?? fallback;
}

export function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed.' });
}
