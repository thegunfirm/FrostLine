// /server/lib/storage.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'orders');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function fileFor(orderId) { ensureDir(); return path.join(DATA_DIR, `${orderId}.json`); }

function readSnapshot(orderId) {
  try {
    const f = fileFor(orderId);
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return null; }
}

function writeSnapshot(orderId, obj) {
  fs.writeFileSync(fileFor(orderId), JSON.stringify(obj, null, 2));
  return obj;
}

module.exports = { readSnapshot, writeSnapshot };