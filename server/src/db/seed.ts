import { getDb } from './index.js';

const LANGUAGES = [
  ['hi', 'Hindi', 'हिन्दी'],
  ['pa', 'Punjabi', 'ਪੰਜਾਬੀ'],
  ['bgc', 'Haryanvi', 'हरियाणवी'],
  ['raj', 'Rajasthani', 'राजस्थानी'],
  ['bho', 'Bhojpuri', 'भोजपुरी'],
  ['mr', 'Marathi', 'मराठी'],
  ['gu', 'Gujarati', 'ગુજરાતી'],
  ['bn', 'Bengali', 'বাংলা'],
  ['ta', 'Tamil', 'தமிழ்'],
  ['te', 'Telugu', 'తెలుగు'],
  ['kn', 'Kannada', 'ಕನ್ನಡ'],
  ['ml', 'Malayalam', 'മലയാളം'],
  ['or', 'Odia', 'ଓଡ଼ିଆ'],
  ['as', 'Assamese', 'অসমীয়া'],
] as const;

const GENRES: Array<[slug: string, name: string, native: string]> = [
  ['bollywood', 'Bollywood', 'बॉलीवुड'],
  ['indian-pop', 'Indian Pop', 'इंडियन पॉप'],
  ['punjabi-pop', 'Punjabi Pop', 'ਪੰਜਾਬੀ ਪੌਪ'],
  ['haryanvi', 'Haryanvi', 'हरियाणवी'],
  ['rajasthani-folk', 'Rajasthani Folk', 'राजस्थानी लोक'],
  ['sufi', 'Sufi', 'सूफ़ी'],
  ['ghazal', 'Ghazal', 'ग़ज़ल'],
  ['bhajan', 'Bhajan', 'भजन'],
  ['devotional', 'Devotional', 'भक्ति'],
  ['folk', 'Folk', 'लोक'],
  ['classical', 'Classical', 'शास्त्रीय'],
  ['indie', 'Indie', 'इंडी'],
  ['rap', 'Rap', 'रैप'],
  ['hip-hop', 'Hip-Hop', 'हिप-हॉप'],
  ['romantic', 'Romantic', 'रोमांटिक'],
  ['sad', 'Sad', 'सैड'],
  ['party', 'Party', 'पार्टी'],
  ['workout', 'Workout', 'वर्कआउट'],
  ['chill', 'Chill', 'चिल'],
  ['lofi', 'Lo-fi', 'लो-फाई'],
  ['wedding', 'Wedding', 'वेडिंग'],
  ['dj-remix', 'DJ / Remix', 'डीजे / रीमिक्स'],
  ['bhajan', 'Bhajan', 'भजन'],
  ['qawwali', 'Qawwali', 'क़व्वाली'],
  ['pop', 'Pop', 'पॉप'],
  ['rock', 'Rock', 'रॉक'],
];

const RADIO_STATIONS = [
  { slug: 'hindi-radio', name: 'Hindi Radio', description: 'Timeless Hindi hits across eras', provider: 'auto', seed: { query: 'best of hindi songs', language: 'hi' }, sort: 1 },
  { slug: 'punjabi-radio', name: 'Punjabi Radio', description: 'Punjabi pop, bhangra & folk', provider: 'auto', seed: { query: 'punjabi hits', language: 'pa' }, sort: 2 },
  { slug: 'haryanvi-radio', name: 'Haryanvi Radio', description: 'High-energy Haryanvi anthems', provider: 'auto', seed: { query: 'haryanvi songs', language: 'bgc' }, sort: 3 },
  { slug: 'rajasthani-radio', name: 'Rajasthani Radio', description: 'Folk & modern Rajasthani sounds', provider: 'auto', seed: { query: 'rajasthani folk songs', language: 'raj' }, sort: 4 },
  { slug: 'bollywood-radio', name: 'Bollywood Radio', description: 'The best of Bollywood', provider: 'auto', seed: { query: 'bollywood hits', language: 'hi' }, sort: 5 },
  { slug: 'romantic-radio', name: 'Romantic Radio', description: 'Love songs for every mood', provider: 'auto', seed: { query: 'romantic hindi songs', genre: 'romantic' }, sort: 6 },
  { slug: 'workout-radio', name: 'Workout Radio', description: 'High-energy beats to keep you moving', provider: 'auto', seed: { query: 'workout punjabi songs', genre: 'workout' }, sort: 7 },
  { slug: 'party-radio', name: 'Party Radio', description: 'Party anthems, desi style', provider: 'auto', seed: { query: 'party punjabi songs', genre: 'party' }, sort: 8 },
  { slug: 'retro90s-radio', name: '90s Hindi Radio', description: 'Nostalgic 90s Bollywood', provider: 'auto', seed: { query: '90s hindi songs', genre: 'retro' }, sort: 9 },
  { slug: '2000s-radio', name: '2000s Hindi Radio', description: 'The 2000s golden era', provider: 'auto', seed: { query: '2000s hindi hits', genre: 'retro' }, sort: 10 },
  { slug: 'indie-radio', name: 'Indian Indie Radio', description: 'Fresh independent Indian artists', provider: 'auto', seed: { query: 'indian indie music', genre: 'indie' }, sort: 11 },
  { slug: 'sufi-radio', name: 'Sufi Radio', description: 'Sufi & qawwali classics', provider: 'auto', seed: { query: 'sufi qawwali', genre: 'sufi' }, sort: 12 },
  { slug: 'tamil-radio', name: 'Tamil Radio', description: 'Tamil cinema & indie hits', provider: 'auto', seed: { query: 'tamil songs hits', language: 'ta' }, sort: 13 },
  { slug: 'bengali-radio', name: 'Bengali Radio', description: 'Bengali classics & modern hits', provider: 'auto', seed: { query: 'bengali songs', language: 'bn' }, sort: 14 },
  { slug: 'bhajan-radio', name: 'Bhajan Radio', description: 'Devotional bhajans', provider: 'auto', seed: { query: 'bhajan devotional', genre: 'bhajan' }, sort: 15 },
  { slug: 'lofi-radio', name: 'Lo-fi Beats Radio', description: 'Chill desi lo-fi to focus to', provider: 'auto', seed: { query: 'indian lofi beats', genre: 'lofi' }, sort: 16 },
];

const FEATURED = [
  { title: 'Hindi Hits', subtitle: 'The biggest Hindi songs right now', provider: 'auto', seed: { query: 'hindi hits 2026' }, sort: 1 },
  { title: 'Punjabi Power', subtitle: 'Punjabi anthems on repeat', provider: 'auto', seed: { query: 'punjabi hits' }, sort: 2 },
  { title: 'Haryanvi Hype', subtitle: 'Latest Haryanvi bangers', provider: 'auto', seed: { query: 'haryanvi songs' }, sort: 3 },
  { title: 'Sufi Soul', subtitle: 'Sufi & qawwali classics', provider: 'auto', seed: { query: 'sufi songs' }, sort: 4 },
  { title: 'Romance Zone', subtitle: 'Love songs in every language', provider: 'auto', seed: { query: 'romantic songs' }, sort: 5 },
  { title: 'Desi Party', subtitle: 'Party starters, desi style', provider: 'auto', seed: { query: 'party songs punjabi' }, sort: 6 },
];

export function seedDb(): void {
  const db = getDb();
  const now = Date.now();

  const langStmt = db.prepare('INSERT OR IGNORE INTO languages (code, name, name_native) VALUES (?, ?, ?)');
  for (const [code, name, native] of LANGUAGES) langStmt.run(code, name, native);

  const genreStmt = db.prepare('INSERT OR IGNORE INTO genres (slug, name, name_native) VALUES (?, ?, ?)');
  for (const [slug, name, native] of GENRES) genreStmt.run(slug, name, native);

  const stationStmt = db.prepare('INSERT OR IGNORE INTO radio_stations (slug, name, description, provider, seed, sort) VALUES (?, ?, ?, ?, ?, ?)');
  for (const s of RADIO_STATIONS) stationStmt.run(s.slug, s.name, s.description, s.provider, JSON.stringify(s.seed), s.sort);

  const featStmt = db.prepare('INSERT OR IGNORE INTO featured_playlists (title, subtitle, provider, seed, sort) VALUES (?, ?, ?, ?, ?)');
  for (const f of FEATURED) featStmt.run(f.title, f.subtitle, f.provider, JSON.stringify(f.seed), f.sort);

  // Seed providers table. `enabled` mirrors runtime config; admin can change it.
  const provStmt = db.prepare('INSERT OR IGNORE INTO providers (id, name, display_name, kind, enabled, priority, config) VALUES (?, ?, ?, ?, ?, ?, ?)');
  provStmt.run('youtube', 'YouTube', 'YouTube (official Data API + IFrame player)', 'stream', 1, 1, JSON.stringify({ refreshIntervalSec: 3600, needsKey: true, note: 'Full-length playback via official YouTube IFrame embed. Discovery requires a YouTube Data API v3 key.' }));
  provStmt.run('internetarchive', 'Internet Archive', 'Internet Archive (legal public-domain / CC audio)', 'stream', 1, 2, JSON.stringify({ refreshIntervalSec: 3600, needsKey: false, note: 'Full-length streams of items whose uploaders permit access. Keyless.' }));
  provStmt.run('musicbrainz', 'MusicBrainz', 'MusicBrainz (open metadata)', 'metadata', 1, 3, JSON.stringify({ refreshIntervalSec: 86400, needsKey: false, note: 'Open music metadata used to normalize search & transliteration.' }));
  // Browser-side fallback providers (used by the web client when the server's
  // providers are unreachable). Seeded so provider_tracks FK references resolve.
  provStmt.run('deezer', 'Deezer', 'Deezer public API (browser fallback — 30s previews)', 'stream', 1, 10, JSON.stringify({ refreshIntervalSec: 3600, needsKey: false, note: 'Used by the web client in preview mode. 30-second preview streams only, per Deezer developer terms.' }));
  provStmt.run('itunes', 'iTunes', 'iTunes Search API (browser fallback — 30s previews)', 'stream', 1, 11, JSON.stringify({ refreshIntervalSec: 3600, needsKey: false, note: 'Used by the web client in preview mode. 30-second preview streams only, per Apple API terms.' }));

  // Seed admin account from env, if provided.
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    // Deferred to auth module to avoid a circular import; handled in app bootstrap instead.
  }
  void now;
}

export { LANGUAGES, GENRES, RADIO_STATIONS, FEATURED };
