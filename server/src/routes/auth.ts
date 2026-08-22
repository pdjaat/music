import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { requireAuth } from '../auth/middleware.js';
import { hashPassword, randomToken, safeEqual, sha256, signToken, verifyPassword } from '../auth/passwords.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(60),
});

authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation', message: 'Check the form: a valid email, a name, and a password of at least 8 characters are required.' });
  }
  const { email, password, displayName } = parsed.data;
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'email_in_use', message: 'An account with this email already exists. Try signing in.' });
  }
  // First-ever user becomes admin when SEED_ADMIN_EMAIL matches; otherwise nobody is admin at signup.
  const isAdmin = config.seedAdminEmail !== '' && email.toLowerCase() === config.seedAdminEmail.toLowerCase();
  const info = db.prepare('INSERT INTO users (email, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)')
    .run(email.toLowerCase(), hashPassword(password), displayName, isAdmin ? 1 : 0);
  const id = Number(info.lastInsertRowid);
  const token = signToken({ id, email: email.toLowerCase(), displayName, isAdmin, theme: 'dark' });
  return res.status(201).json({ token, user: { id, email: email.toLowerCase(), displayName, isAdmin, theme: 'dark' } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'validation', message: 'Enter your email and password.' });
  }
  const { email, password } = parsed.data;
  const db = getDb();
  const row = db.prepare('SELECT id, email, password_hash, display_name, is_admin, theme FROM users WHERE email = ?')
    .get(email.toLowerCase()) as { id: number; email: string; password_hash: string; display_name: string; is_admin: number; theme: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password.' });
  }
  const user = { id: row.id, email: row.email, displayName: row.display_name, isAdmin: Boolean(row.is_admin), theme: row.theme };
  const token = signToken(user);
  db.prepare('UPDATE users SET last_seen_at = datetime(\'now\') WHERE id = ?').run(row.id);
  return res.json({ token, user });
});

authRouter.post('/logout', (_req, res) => {
  // Stateless JWT — the client discards the token. Endpoint kept for API symmetry.
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const profileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  theme: z.enum(['dark', 'light']).optional(),
});

authRouter.patch('/me', requireAuth, (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Invalid profile data.' });
  const db = getDb();
  const sets: string[] = [];
  const vals: Array<string | number | null> = [];
  if (parsed.data.displayName) { sets.push('display_name = ?'); vals.push(parsed.data.displayName); }
  if (parsed.data.theme) { sets.push('theme = ?'); vals.push(parsed.data.theme); }
  if (sets.length) {
    vals.push(req.user!.id);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
  const row = db.prepare('SELECT id, email, display_name, is_admin, theme FROM users WHERE id = ?').get(req.user!.id) as
    { id: number; email: string; display_name: string; is_admin: number; theme: string };
  res.json({ user: { id: row.id, email: row.email, displayName: row.display_name, isAdmin: Boolean(row.is_admin), theme: row.theme } });
});

const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });

authRouter.post('/change-password', requireAuth, (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'New password must be at least 8 characters.' });
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string };
  if (!verifyPassword(parsed.data.currentPassword, row.password_hash)) {
    return res.status(400).json({ error: 'invalid_credentials', message: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(parsed.data.newPassword), req.user!.id);
  res.json({ ok: true });
});

const forgotSchema = z.object({ email: z.string().email() });

authRouter.post('/forgot-password', (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'Enter a valid email address.' });
  const db = getDb();
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(parsed.data.email.toLowerCase()) as { id: number } | undefined;
  // Always succeed to avoid user enumeration; only issue a token for known accounts.
  if (row) {
    const token = randomToken();
    db.prepare('DELETE FROM reset_tokens WHERE user_id = ?').run(row.id);
    db.prepare('INSERT INTO reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
      .run(row.id, sha256(token), new Date(Date.now() + 60 * 60 * 1000).toISOString());
    // In production wire this to an email provider; for self-hosted/MVP the token
    // is returned so a dev can complete the flow (documented in README).
    if (config.env !== 'production') {
      return res.json({ ok: true, devResetToken: token });
    }
  }
  res.json({ ok: true });
});

const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8).max(128) });

authRouter.post('/reset-password', (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'validation', message: 'New password must be at least 8 characters.' });
  const db = getDb();
  const row = db.prepare('SELECT id, user_id, expires_at FROM reset_tokens WHERE token_hash = ?').get(sha256(parsed.data.token)) as
    | { id: number; user_id: number; expires_at: string; used?: number }
    | undefined;
  if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'invalid_token', message: 'This reset link is invalid or has expired. Request a new one.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(parsed.data.password), row.user_id);
  db.prepare('UPDATE reset_tokens SET used = 1 WHERE id = ?').run(row.id);
  res.json({ ok: true });
});
