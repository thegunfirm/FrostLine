// /server/lib/orderNumbers.js
// Stable order-number minting: single -> -0; multi -> -Z parent and -ZA, -ZB... children.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEQ_FILE = path.join(__dirname, '..', 'data', 'order-seq.json');

// Ensure data dir exists
function ensureDataFile() {
  const dataDir = path.dirname(SEQ_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(SEQ_FILE)) {
    fs.writeFileSync(SEQ_FILE, JSON.stringify({ last: 100000 }, null, 2)); // start at 100000
  }
}

function nextBaseNumber() {
  ensureDataFile();
  const raw = JSON.parse(fs.readFileSync(SEQ_FILE, 'utf8'));
  raw.last = (raw.last || 100000) + 1;
  fs.writeFileSync(SEQ_FILE, JSON.stringify(raw, null, 2));
  return String(raw.last);
}

/**
 * outcomes: array of normalized shipping outcomes in the order they will be fulfilled.
 * Example values you already use: "DS>FFL", "DS>Customer", "IH>FFL", "IH>Customer"
 */
function mintOrderNumber(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    throw new Error('outcomes[] is required');
  }
  const base = nextBaseNumber();

  if (outcomes.length === 1) {
    // single-shipment ends with 0
    return { main: `${base}-0`, parts: [] };
  }

  // multi-shipment: main ends with Z, parts get A,B,C,D ...
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const parts = outcomes.map((o, idx) => ({
    outcome: o,
    orderNumber: `${base}-Z${letters[idx]}`
  }));
  return { main: `${base}-Z`, parts };
}

export { mintOrderNumber };