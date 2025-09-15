// /server/routes/orderSnapshot.ts
// POST /api/orders/:orderId/snapshot
// Body: { items:[{sku,upc,mpn,name,qty,price,imageUrl}], shippingOutcomes:[...], customer:{}, txnId, status }
// Persists a canonical snapshot and mints the order number (once) for stability.

import express from 'express';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';
import { readSnapshot, writeSnapshot } from '../lib/order-storage.js';

const router = express.Router();

router.post('/api/orders/:orderId/snapshot', express.json(), (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const body = req.body || {};
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) return res.status(400).json({ error: 'items[] required' });

  const items = rawItems.map((it: any) => ({
    sku: String(it.sku || ''),      // RSR Stock #
    upc: String(it.upc || ''),      // UPC
    mpn: String(it.mpn || ''),      // Manufacturer Part #
    name: String(it.name || ''),
    qty: Number(it.qty || 1),
    price: Number(it.price || 0),
    imageUrl: String(it.imageUrl || '')
  }));

  let outcomes;
  try {
    outcomes = splitOutcomes(body.shippingOutcomes || ['DS>Customer']);
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'Invalid shippingOutcomes' });
  }

  const existing = readSnapshot(orderId) || {};
  // Preserve existing minted numbers to keep them stable across retries
  const minted = existing.minted || mintOrderNumber(outcomes);

  const snapshot = {
    orderId,
    txnId: String(body.txnId || existing.txnId || ''),
    status: String(body.status || existing.status || 'processing'),
    customer: body.customer || existing.customer || {},
    items,
    shippingOutcomes: outcomes,
    minted,                // { main, parts[] }
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeSnapshot(orderId, snapshot);
  return res.json({ ok: true, orderId, mainOrderNumber: minted.main });
});

export default router;