// /server/routes/orderSnapshot.js
// POST /api/orders/:orderId/snapshot
// Required at payment-success, before redirect to /order-confirmation.
// Body MUST include items with product metadata (no cross-service enrichment).

const express = require('express');
const { splitOutcomes } = require('../lib/shippingSplit.js');
const { mintOrderNumber } = require('../lib/orderNumbers.js');
const { readSnapshot, writeSnapshot } = require('../lib/storage.js');

const router = express.Router();

router.post('/api/orders/:orderId/snapshot', express.json(), (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const body = req.body || {};
  const itemsIn = Array.isArray(body.items) ? body.items : [];
  if (!itemsIn.length) return res.status(422).json({ error: 'items[] required' });

  // Validate required item fields so the UI never renders blanks.
  const missing = [];
  itemsIn.forEach((it, i) => {
    if (!it.name) missing.push(`items[${i}].name`);
    if (!it.qty && it.qty !== 0) missing.push(`items[${i}].qty`);
    if (it.price === undefined || it.price === null) missing.push(`items[${i}].price`);
    if (!it.upc) missing.push(`items[${i}].upc`);
    if (!it.mpn) missing.push(`items[${i}].mpn`);
    if (!it.sku) missing.push(`items[${i}].sku`);
    if (!it.imageUrl) missing.push(`items[${i}].imageUrl`);
  });
  if (missing.length) {
    return res.status(422).json({ error: 'Missing required fields', fields: missing });
  }

  let outcomes;
  try { outcomes = splitOutcomes(body.shippingOutcomes || ['IH>Customer']); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  const existing = readSnapshot(orderId) || {};
  const minted = existing.minted || mintOrderNumber(outcomes);

  const snapshot = {
    orderId,
    txnId: String(body.txnId || existing.txnId || ''),
    status: String(body.status || existing.status || 'processing'),
    customer: body.customer || existing.customer || {},
    items: itemsIn.map((it) => ({
      sku: String(it.sku), upc: String(it.upc), mpn: String(it.mpn),
      name: String(it.name), qty: Number(it.qty || 1), price: Number(it.price || 0),
      imageUrl: String(it.imageUrl)
    })),
    shippingOutcomes: outcomes,
    allocations: body.allocations || existing.allocations || null, // optional
    minted, // { main, parts[] }
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeSnapshot(orderId, snapshot);
  return res.json({ ok: true, orderId, orderNumber: minted.main });
});

module.exports = router;