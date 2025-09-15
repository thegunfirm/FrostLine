// server/routes/orderSnapshot.ts
// POST /api/orders/:orderId/snapshot  — v1 "never-block" writer
// Accept messy cart lines, normalize, fill defaults, mint once, persist.

import express from 'express';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';
import { readSnapshot, writeSnapshot } from '../lib/storage.js';

const router = express.Router();

function firstNonEmpty(...vals: any[]): any {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = (typeof v === 'string') ? v.trim() : v;
    if (s !== '' && s !== false) return s;
  }
  return undefined;
}

router.post('/api/orders/:orderId/snapshot', express.json(), (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const body = req.body || {};
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) return res.status(422).json({ error: 'items[] required' });

  // Normalize every line, tolerate missing fields, use safe defaults
  const items = rawItems.map((it: any, idx: number) => {
    const upc = String(firstNonEmpty(
      it.upc, it.UPC, it.upc_code, it.barcode,
      it.product?.upc, it.product?.UPC
    ) || `UNKNOWN-${idx+1}`);

    const mpn = String(firstNonEmpty(
      it.mpn, it.MPN, it.MNP, it.manufacturerPart, it.manufacturerPartNumber,
      it.product?.mpn
    ) || '');

    const sku = String(firstNonEmpty(
      it.sku, it.SKU, it.stock, it.stockNo, it.stock_num, it.rsrStock,
      it.product?.sku
    ) || '');

    const name = String(firstNonEmpty(
      it.name, it.title, it.description, it.product?.name
    ) || `Item ${upc}`);

    const qty = Number(firstNonEmpty(it.qty, it.quantity, it.count, 1));
    const price = Number(firstNonEmpty(
      it.price, it.unitPrice, it.unit_price,
      it.retail, it.pricingSnapshot?.retail, 0
    ));

    // Images are irrelevant to processing; force local placeholder if not local
    let imageUrl = String(firstNonEmpty(it.imageUrl, it.product?.imageUrl, '') || '');
    if (!imageUrl.startsWith('/images/')) {
      imageUrl = upc.startsWith('UNKNOWN-') ? '/images/placeholder.jpg' : `/images/${upc}.jpg`;
    }

    return { upc, mpn, sku, name, qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
             price: Number.isFinite(price) && price >= 0 ? price : 0,
             imageUrl };
  });

  // Outcomes (default single shipment)
  let outcomes: any[] = [];
  try {
    outcomes = splitOutcomes(body.shippingOutcomes || ['IH>Customer']);
  } catch (e) {
    outcomes = ['IH>Customer'];
  }

  // Preserve any prior snapshot + minted numbers
  const existing = readSnapshot(orderId) || {};
  const minted = existing.minted || mintOrderNumber(outcomes);

  const snapshot = {
    orderId,
    txnId: String(body.txnId || existing.txnId || ''),
    status: String(body.status || existing.status || 'processing'),
    customer: body.customer || existing.customer || {},
    items,
    shippingOutcomes: outcomes,
    allocations: body.allocations || existing.allocations || null,
    minted, // { main, parts[] }
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeSnapshot(orderId, snapshot);
  return res.json({ ok: true, orderId, orderNumber: minted.main });
});

export default router;