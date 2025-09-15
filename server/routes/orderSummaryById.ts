// /server/routes/orderSummaryById.ts
// GET /api/orders/:orderId/summary  (the exact path your confirmation page calls)

import express from 'express';
import { readSnapshot, writeSnapshot } from '../lib/order-storage.js';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';

const router = express.Router();

router.get('/api/orders/:orderId/summary', async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const snap = readSnapshot(orderId);
  if (!snap) {
    // Not found: the UI will render blanks; better to be explicit.
    return res.status(404).json({ error: 'Order snapshot not found for this orderId' });
  }

  // Ensure outcomes are normalized and order number is minted (persist once)
  let outcomes = [];
  try { 
    outcomes = splitOutcomes(snap.shippingOutcomes || ['DS>Customer']); 
  } catch (e: any) { 
    return res.status(400).json({ error: e.message || 'Invalid shippingOutcomes' }); 
  }

  const minted = snap.minted || mintOrderNumber(outcomes);
  if (!snap.minted) {
    snap.minted = minted;
    snap.updatedAt = new Date().toISOString();
    writeSnapshot(orderId, snap);
  }

  const items = Array.isArray(snap.items) ? snap.items : [];

  const shipments = (minted.parts.length ? minted.parts : [{ outcome: outcomes[0], orderNumber: minted.main }])
    .map((p: any, idx: number) => ({
      idx,
      outcome: p.outcome || outcomes[0],
      orderNumber: p.orderNumber || minted.main,
      items
    }));

  const totals = computeTotals(items);

  return res.json({
    orderId,
    mainOrderNumber: minted.main,
    multiShipment: minted.parts.length > 0,
    shipments,
    customer: snap.customer || {},
    totals,
    status: snap.status || 'processing',
    txnId: snap.txnId || ''
  });
});

function computeTotals(items: any[]) {
  const sub = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
  return {
    subtotal: round2(sub),
    tax: 0,
    shipping: 0,
    grandTotal: round2(sub)
  };
}

function round2(n: number) { 
  return Math.round(Number(n) * 100) / 100; 
}

export default router;