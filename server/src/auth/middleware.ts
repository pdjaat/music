import { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { AuthUser, verifyToken } from './passwords.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    const db = getDb();
    const row = db.prepare('SELECT id, email, display_name, is_admin, theme FROM users WHERE id = ?').get(Number(payload.sub)) as
      | { id: number; email: string; display_name: string; is_admin: number; theme: string }
      | undefined;
    if (row) {
      req.user = { id: row.id, email: row.email, displayName: row.display_name, isAdmin: Boolean(row.is_admin), theme: row.theme };
      db.prepare('UPDATE users SET last_seen_at = datetime(\'now\') WHERE id = ?').run(row.id);
    }
  } catch {
    // invalid/expired token — treat as guest
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'authentication_required', message: 'Please sign in to use this feature.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'authentication_required', message: 'Please sign in to use this feature.' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'forbidden', message: 'You do not have permission to access this.' });
    return;
  }
  next();
}
