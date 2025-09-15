// server/routes/orderSummaryById.js
// GET /api/orders/:orderId/summary  — v1 "never-block" reader
// Reads the saved snapshot, normalizes fields, fills defaults, and returns a stable payload.

const express = require('express');
const { readSnapshot, writeSnapshot } = require('../lib/storage');
const { splitOutcomes } = require('../lib/shippingSplit');
const { mintOrderNumber } = require('../lib/orderNumbers');

const router = express.Router();

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = (typeof v === 'string') ? v.trim() : v;
    if (s !== '' && s !== false) return s;
  }
  return undefined;
}

router.get('/api/orders/:orderId/summary', (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const snap = readSnapshot(orderId);
  if (!snap) return res.status(404).json({ error: 'Order snapshot not found for this orderId' });

  // Normalize outcomes & mint once (persist if missing)
  let outcomes = [];
  try { outcomes = splitOutcomes(snap.shippingOutcomes || ['IH>Customer']); }
  catch { outcomes = ['IH>Customer']; }

  const minted = snap.minted || mintOrderNumber(outcomes);
  if (!snap.minted) {
    snap.minted = minted;
    snap.updatedAt = new Date().toISOString();
    writeSnapshot(orderId, snap);
  }

  // Use real product data from snapshot - NO FALLBACKS
  const rawItems = Array.isArray(snap.items) ? snap.items : [];
  const normItems = rawItems.map((it, idx) => {
    const upc = String(firstNonEmpty(it.upc, it.UPC, it.upc_code, it.product?.upc) || '');
    const mpn = String(firstNonEmpty(it.mpn, it.MPN, it.MNP, it.product?.mpn) || '');
    const sku = String(firstNonEmpty(it.sku, it.SKU, it.product?.sku) || '');
    const name = String(firstNonEmpty(it.name, it.title, it.product?.name) || `Product ${idx+1}`);
    const qty  = Number(firstNonEmpty(it.qty, it.quantity, 1));
    const unit = Number(firstNonEmpty(it.price, it.unitPrice, it.retail, it.pricingSnapshot?.retail, 0));

    // Images based on SKU since that's what we have
    let imageUrl = String(firstNonEmpty(it.imageUrl, it.product?.imageUrl, '') || '');
    if (!imageUrl.startsWith('/images/')) {
      imageUrl = sku ? `/images/${sku}.jpg` : '/images/placeholder.jpg';
    }

    // Build a line the UI can read regardless of legacy shape
    const line = {
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      pricingSnapshot: { retail: Number.isFinite(unit) && unit >= 0 ? unit : 0 },
      unitPrice: Number.isFinite(unit) && unit >= 0 ? unit : 0,
      extendedPrice: round2((Number.isFinite(unit) && unit >= 0 ? unit : 0) * (Number.isFinite(qty) && qty > 0 ? qty : 1)),
      product: {
        sku, upc, mpn, name,
        image: { url: imageUrl },
        imageUrl,   // product-level alias
        UPC: upc, MPN: mpn, SKU: sku, NAME: name // uppercase aliases some code paths use
      },
      // line-level aliases (many legacy components look here)
      sku, upc, mpn, name, imageUrl
    };
    return line;
  });

  // Shipments (Amazon-style): v1 shows same lines per outcome unless allocations are present
  const parts = (minted.parts.length ? minted.parts : [{ outcome: outcomes[0], orderNumber: minted.main }]);
  const shipments = parts.map((p, idx) => ({
    idx,
    outcome: p.outcome || outcomes[0],
    orderNumber: p.orderNumber || minted.main,
    lines: normItems,
    totals: computeTotals(normItems)
  }));

  const totals = computeTotals(normItems);

  // Top-level aliases so the header never falls back to the URL id
  return res.json({
    orderId,                              // raw query id (e.g., 133)
    orderNumber: minted.main,             // primary minted number (e.g., 100009-0)
    orderNumberText: minted.main,         // alias
    order: {
      id: minted.main,                    // some UIs read order.id
      number: minted.main,                // some UIs read order.number
      orderNumber: minted.main,           // some UIs read order.orderNumber
      idRaw: orderId
    },
    mainOrderNumber: minted.main,
    multiShipment: minted.parts.length > 0,
    lines: normItems,
    shipments,
    customer: snap.customer || {},
    totals,
    status: snap.status || 'processing',
    txnId: snap.txnId || ''
  });
});

function computeTotals(lines) {
  const sub = lines.reduce((s, ln) => s + Number(ln.extendedPrice || 0), 0);
  return { subtotal: round2(sub), tax: 0, shipping: 0, grandTotal: round2(sub) };
}
function round2(n) { return Math.round(Number(n) * 100) / 100; }

module.exports = router;