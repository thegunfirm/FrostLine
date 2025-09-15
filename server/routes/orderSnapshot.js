// server/routes/orderSnapshot.js
// POST /api/orders/:orderId/snapshot  — v1 "never-block" writer
// Accept messy cart lines, look up real products, normalize, mint once, persist.

const express = require('express');
const { splitOutcomes } = require('../lib/shippingSplit');
const { mintOrderNumber } = require('../lib/orderNumbers');
const { readSnapshot, writeSnapshot } = require('../lib/storage');
const { db } = require('../db');

const router = express.Router();

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = (typeof v === 'string') ? v.trim() : v;
    if (s !== '' && s !== false) return s;
  }
  return undefined;
}

router.post('/api/orders/:orderId/snapshot', express.json(), async (req, res) => {
  try {
    const orderId = String(req.params.orderId || '').trim();
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const body = req.body || {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) return res.status(422).json({ error: 'items[] required' });

    // Look up real products from database
    const items = [];
    for (let idx = 0; idx < rawItems.length; idx++) {
      const it = rawItems[idx];
      
      // Find product identifier (SKU, UPC, or product ID)
      const sku = firstNonEmpty(it.sku, it.SKU, it.rsrStock, it.stock, it.stockNumber);
      const upc = firstNonEmpty(it.upc, it.UPC, it.upc_code, it.barcode);
      const productId = firstNonEmpty(it.productId, it.product_id, it.id);

      let product = null;
      
      // Try to find product in database
      if (sku) {
        product = await db.selectFrom('products').selectAll().where('sku', '=', sku).executeTakeFirst();
      }
      if (!product && upc) {
        product = await db.selectFrom('products').selectAll().where('upc', '=', upc).executeTakeFirst();
      }
      if (!product && productId) {
        product = await db.selectFrom('products').selectAll().where('id', '=', parseInt(productId)).executeTakeFirst();
      }

      if (!product) {
        return res.status(422).json({ 
          error: `Item ${idx + 1}: Product not found in database. Provided: ${JSON.stringify({sku, upc, productId})}` 
        });
      }

      // Get quantity and price from cart item
      const qty = Number(firstNonEmpty(it.qty, it.quantity, it.count, 1));
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(422).json({ error: `Item ${idx + 1}: Valid quantity required` });
      }

      const price = Number(firstNonEmpty(
        it.price, it.unitPrice, it.unit_price, product.price, 0
      ));
      if (!Number.isFinite(price) || price < 0) {
        return res.status(422).json({ error: `Item ${idx + 1}: Valid price required` });
      }

      // Use real product data
      items.push({ 
        upc: product.upc || '',
        mpn: product.manufacturerPartNumber || product.mpn || '',
        sku: product.sku || '',
        name: product.name || '',
        qty,
        price,
        imageUrl: `/images/${product.sku || product.upc || 'placeholder'}.jpg`
      });
    }

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
    
  } catch (error) {
    console.error('Order snapshot error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;