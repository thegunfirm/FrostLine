// /server/lib/storage.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data', 'orders');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function fileFor(orderId: string) { ensureDir(); return path.join(DATA_DIR, `${orderId}.json`); }

export function readSnapshot(orderId: string) {
  try {
    const f = fileFor(orderId);
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return null; }
}

export function writeSnapshot(orderId: string, obj: any) {
  fs.writeFileSync(fileFor(orderId), JSON.stringify(obj, null, 2));
  return obj;
}