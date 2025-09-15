// /server/routes/orderSummary.js
// POST /api/order-summary/build
// Body shape (example):
// {
//   "orderId": "temp-or-external-id",
//   "customer": {...},
//   "items": [
//     {"sku":"<RSR#>","upc":"<UPC>","mpn":"<MPN>","name":"...","qty":1,"price":123.45,"imageUrl":"..."},
//     ...
//   ],
//   "shippingOutcomes": ["DS>FFL","IH>Customer"] // any subset
// }
//
// Returns a normalized summary with split outcomes and (if multiple) sub-order numbers.
// This DOES NOT alter frozen UI; it only builds a payload your customer UI can render.

import express from 'express';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';

const router = express.Router();

router.post('/api/order-summary/build', express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    // Minimal validation
    if (items.length === 0) return res.status(400).json({ error: 'items[] required' });

    // Normalize items to ensure UPC/MPN/Image are present (do not fetch Inventory here to avoid auth issues)
    const normalizedItems = items.map((it) => ({
      sku: String(it.sku || ''),          // RSR Stock #
      upc: String(it.upc || ''),          // UPC (search-friendly)
      mpn: String(it.mpn || ''),          // Manufacturer Part #
      name: String(it.name || ''),
      qty: Number(it.qty || 1),
      price: Number(it.price || 0),
      imageUrl: String(it.imageUrl || ''), // expected to be passed in from checkout pipeline
    }));

    const outcomes = splitOutcomes(body.shippingOutcomes || ['DS>Customer']);
    const minted = mintOrderNumber(outcomes);

    // Build shipments mapping
    const shipments = (minted.parts.length ? minted.parts : [{ outcome: outcomes[0], orderNumber: minted.main }])
      .map((p, idx) => ({
        idx,
        outcome: p.outcome || outcomes[0],
        orderNumber: p.orderNumber || minted.main,
        // naïve split strategy: all items on all sub-orders unless you pass per-line allocations;
        // you can add "allocations" in request later without touching this route.
        items: normalizedItems
      }));

    const summary = {
      orderId: String(body.orderId || ''),
      mainOrderNumber: minted.main,
      multiShipment: minted.parts.length > 0,
      shipments,
      customer: body.customer || {},
      totals: computeTotals(normalizedItems)
    };

    return res.json(summary);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Bad Request' });
  }
});

function computeTotals(items) {
  const sub = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
  return {
    subtotal: round2(sub),
    tax: 0,               // left to your existing tax engine
    shipping: 0,          // calculated elsewhere
    grandTotal: round2(sub) // placeholder until your tax/ship injected
  };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export default router;