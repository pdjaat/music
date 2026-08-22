import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config, requireSecret } from '../config.js';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
  theme: string;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: String(user.id), email: user.email, admin: user.isAdmin }, requireSecret(), {
    expiresIn: config.jwtExpiresIn,
    issuer: 'sangeet',
    audience: 'sangeet-web',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): { sub: string; email: string; admin: boolean } {
  const payload = jwt.verify(token, requireSecret(), { issuer: 'sangeet', audience: 'sangeet-web' }) as {
    sub: string; email: string; admin: boolean;
  };
  return payload;
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Timing-safe compare for tokens. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
