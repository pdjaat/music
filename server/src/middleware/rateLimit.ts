import { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

/**
 * Simple in-memory sliding-window rate limiter (per IP).
 * In production, swap for a Redis-backed limiter (see docs).
 */

const buckets = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, stamps] of buckets) {
    const fresh = stamps.filter((t) => now - t < config.rateLimit.windowMs);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}, 60_000).unref();

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const stamps = buckets.get(ip) ?? [];
  const fresh = stamps.filter((t) => now - t < config.rateLimit.windowMs);
  if (fresh.length >= config.rateLimit.max) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please slow down and try again shortly.' });
    return;
  }
  fresh.push(now);
  buckets.set(ip, fresh);
  next();
}
