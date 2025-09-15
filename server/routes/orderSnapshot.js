// server/routes/orderSnapshot.js
// POST /api/orders/:orderId/snapshot  — v1 "never-block" writer
// Accept messy cart lines, normalize, fill defaults, mint once, persist.

const express = require('express');
const { splitOutcomes } = require('../lib/shippingSplit');
const { mintOrderNumber } = require('../lib/orderNumbers');
const { readSnapshot, writeSnapshot } = require('../lib/storage');

const router = express.Router();

function firstNonEmpty(...vals) {
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

  // Strict validation - NO FALLBACKS, error out if missing required data
  const items = rawItems.map((it, idx) => {
    const upc = firstNonEmpty(
      it.upc, it.UPC, it.upc_code, it.barcode,
      it.product?.upc, it.product?.UPC
    );
    if (!upc) {
      throw new Error(`Item ${idx + 1}: UPC is required but missing. No fallbacks allowed.`);
    }

    const mpn = firstNonEmpty(
      it.mpn, it.MPN, it.MNP, it.manufacturerPart, it.manufacturerPartNumber,
      it.product?.mpn
    );
    if (!mpn) {
      throw new Error(`Item ${idx + 1}: MPN is required but missing. No fallbacks allowed.`);
    }

    const name = firstNonEmpty(
      it.name, it.title, it.description, it.product?.name
    );
    if (!name) {
      throw new Error(`Item ${idx + 1}: Product name is required but missing. No fallbacks allowed.`);
    }

    const qty = Number(firstNonEmpty(it.qty, it.quantity, it.count));
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(`Item ${idx + 1}: Valid quantity is required but missing. No fallbacks allowed.`);
    }

    const price = Number(firstNonEmpty(
      it.price, it.unitPrice, it.unit_price,
      it.retail, it.pricingSnapshot?.retail
    ));
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Item ${idx + 1}: Valid price is required but missing. No fallbacks allowed.`);
    }

    // Images are irrelevant to processing; use UPC-based path
    const imageUrl = `/images/${upc}.jpg`;

    return { 
      upc: String(upc), 
      mpn: String(mpn), 
      sku: '', // You said you don't use SKU 
      name: String(name), 
      qty, 
      price,
      imageUrl 
    };
  });

  // Outcomes (default single shipment)
  let outcomes = [];
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

module.exports = router;