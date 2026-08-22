import fs from 'node:fs';
import path from 'node:path';

// Start every test run with a clean database.
const dir = path.resolve(process.cwd(), 'data-test');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
