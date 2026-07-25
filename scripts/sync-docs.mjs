import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const docs = join(root, 'docs');

if (!existsSync(dist)) {
  throw new Error('dist/ missing — run vite build first');
}

rmSync(docs, { recursive: true, force: true });
mkdirSync(docs, { recursive: true });
cpSync(dist, docs, { recursive: true });
console.log('Synced dist/ → docs/ for GitHub Pages (branch /docs)');
