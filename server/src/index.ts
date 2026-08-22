import { createApp } from './app.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { hashPassword } from './auth/passwords.js';

// Seed admin from env when configured (idempotent).
function seedAdmin(): void {
  const email = config.seedAdminEmail;
  const password = config.seedAdminPassword;
  if (!email || !password) return;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email.toLowerCase());
  } else {
    db.prepare('INSERT INTO users (email, password_hash, display_name, is_admin) VALUES (?, ?, ?, 1)')
      .run(email.toLowerCase(), hashPassword(password), 'Admin');
  }
  console.log(`[sangeet] admin account ensured for ${email}`);
}

seedAdmin();

const app = createApp();
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[sangeet] API listening on http://0.0.0.0:${config.port} (${config.env})`);
  console.log(`[sangeet] providers: youtube=${config.youtubeApiKey ? 'configured' : 'NOT configured'}`);
});
