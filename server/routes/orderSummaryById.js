// /server/routes/orderSummaryById.js
// GET /api/orders/:orderId/summary  -> exact shape the frozen UI consumes

const express = require('express');
const { readSnapshot, writeSnapshot } = require('../lib/storage.js');
const { splitOutcomes } = require('../lib/shippingSplit.js');
const { mintOrderNumber } = require('../lib/orderNumbers.js');

const router = express.Router();

router.get('/api/orders/:orderId/summary', (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const snap = readSnapshot(orderId);
  if (!snap) return res.status(404).json({ error: 'Order snapshot not found for this orderId' });

  // Normalize outcomes & mint once
  let outcomes;
  try { outcomes = splitOutcomes(snap.shippingOutcomes || ['IH>Customer']); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  const minted = snap.minted || mintOrderNumber(outcomes);
  if (!snap.minted) {
    snap.minted = minted;
    snap.updatedAt = new Date().toISOString();
    writeSnapshot(orderId, snap);
  }

  // Enforce required fields (stop blank UI)
  const items = Array.isArray(snap.items) ? snap.items.filter(Boolean) : [];
  const missing = [];
  items.forEach((it, i) => {
    if (!it.upc) missing.push(`items[${i}].upc`);
    if (!it.mpn) missing.push(`items[${i}].mpn`);
    if (!it.sku) missing.push(`items[${i}].sku`);
    if (!it.name) missing.push(`items[${i}].name`);
    if (it.price === undefined || it.price === null) missing.push(`items[${i}].price`);
    if (!it.imageUrl) missing.push(`items[${i}].imageUrl`);
    if (!it.qty && it.qty !== 0) missing.push(`items[${i}].qty`);
  });
  if (missing.length) {
    return res.status(422).json({ error: 'Snapshot incomplete for summary', fields: missing });
  }

  // Full cart lines (what the page iterates)
  const linesAll = items.map(toLine);

  // Per-shipment splits (Amazon-style)
  const parts = (minted.parts.length ? minted.parts : [{ outcome: outcomes[0], orderNumber: minted.main }]);
  const alloc = (snap.allocations && typeof snap.allocations === 'object') ? snap.allocations : null;

  const shipments = parts.map((p, idx) => {
    const shipItems = itemsForOutcome(p.outcome || outcomes[0], items, alloc);
    const shipLines = shipItems.map(toLine);
    return { idx, outcome: p.outcome || outcomes[0], orderNumber: p.orderNumber || minted.main, lines: shipLines, totals: computeTotals(shipLines) };
  });

  const totals = sumTotals(shipments.map(s => s.totals));

  return res.json({
    orderId,
    orderNumber: minted.main,          // << the key your page expects (no more "128")
    mainOrderNumber: minted.main,      // kept for other consumers
    multiShipment: minted.parts.length > 0,
    lines: linesAll,                   // top-level lines some UI reads
    shipments,                         // Amazon-style details per shipment
    customer: snap.customer || {},
    totals,
    status: snap.status || 'processing',
    txnId: snap.txnId || ''
  });
});

function toLine(it) {
  const qty = Number(it.qty || 1);
  const unit = Number(it.price || 0);
  const imageUrl = String(it.imageUrl || '');
  return {
    qty,
    pricingSnapshot: { retail: unit, /* optional: member */ },
    unitPrice: unit,
    extendedPrice: round2(unit * qty),
    product: {
      sku: String(it.sku || ''), upc: String(it.upc || ''), mpn: String(it.mpn || ''), name: String(it.name || ''),
      image: { url: imageUrl }
    }
  };
}

function itemsForOutcome(outcome, items, allocations) {
  if (!allocations || !allocations[outcome]) return items;
  const a = allocations[outcome];
  if (!Array.isArray(a) || !a.length) return [];
  if (typeof a[0] === 'number') return a.map(i => items[i]).filter(Boolean);
  // selector objects
  return a.map(sel => {
    const found = items.find(it =>
      (sel.sku && it.sku === sel.sku) || (sel.upc && it.upc === sel.upc) || (sel.mpn && it.mpn === sel.mpn)
    );
    if (!found) return null;
    return { ...found, qty: (sel.qty ?? found.qty) };
  }).filter(Boolean);
}

function computeTotals(lines) {
  const sub = lines.reduce((s, ln) => s + Number(ln.extendedPrice || 0), 0);
  return { subtotal: round2(sub), tax: 0, shipping: 0, grandTotal: round2(sub) };
}
function sumTotals(list) {
  return list.reduce((acc, t) => ({
    subtotal: round2((acc.subtotal||0) + (t.subtotal||0)),
    tax: round2((acc.tax||0) + (t.tax||0)),
    shipping: round2((acc.shipping||0) + (t.shipping||0)),
    grandTotal: round2((acc.grandTotal||0) + (t.grandTotal||0)),
  }), { subtotal:0,tax:0,shipping:0,grandTotal:0 });
}
function round2(n) { return Math.round(Number(n) * 100) / 100; }

module.exports = router;