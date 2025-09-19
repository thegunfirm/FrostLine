// server/routes/orderSnapshot.ts
// POST /api/orders/:orderId/snapshot  — v1 "never-block" writer
// Accept messy cart lines, normalize, fill defaults, mint once, persist.

import express from 'express';
import { splitOutcomes } from '../lib/shippingSplit.js';
import { mintOrderNumber } from '../lib/orderNumbers.js';
import { readSnapshot, writeSnapshot } from '../lib/storage.js';
import { storage } from '../storage.js';

const router = express.Router();

function firstNonEmpty(...vals: any[]): any {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = (typeof v === 'string') ? v.trim() : v;
    if (s !== '' && s !== false) return s;
  }
  return undefined;
}

router.post('/api/orders/:orderId/snapshot', express.json(), async (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.status(400).json({ error: 'orderId required' });

  const body = req.body || {};
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) return res.status(422).json({ error: 'items[] required' });

  // Normalize every line with proper error handling for zero tolerance policy
  let items: any[] = [];
  try {
    items = await Promise.all(rawItems.map(async (it: any, idx: number) => {
    let upc = String(firstNonEmpty(
      it.upc, it.UPC, it.upc_code, it.barcode,
      it.product?.upc, it.product?.UPC
    ) || '');

    let mpn = String(firstNonEmpty(
      it.mpn, it.MPN, it.MNP, it.manufacturerPart, it.manufacturerPartNumber,
      it.product?.mpn
    ) || '');

    let sku = String(firstNonEmpty(
      it.sku, it.SKU, it.stock, it.stockNo, it.stock_num, it.rsrStock,
      it.product?.sku
    ) || '');

    let name = String(firstNonEmpty(
      it.name, it.title, it.description, it.product?.name
    ) || '');
    
    // ZERO TOLERANCE: Block orders missing authentic RSR data
    if (!upc || !name || upc.startsWith('UNKNOWN')) {
      try {
        let product = null;
        if (it.productId) {
          product = await storage.getProduct(it.productId);
        } else if (sku) {
          product = await storage.getProductBySku(sku);
        }
        
        if (product && product.upcCode && product.name) {
          // Use authentic product data from database
          upc = product.upcCode;
          mpn = product.manufacturerPartNumber || mpn;
          sku = product.sku || sku;
          name = product.name;
          console.log(`✅ Recovered authentic data for ${sku}: ${name} (UPC: ${upc})`);
        } else {
          // BLOCK ORDER: Cannot proceed without authentic RSR data
          console.error(`❌ BLOCKING ORDER: Item ${idx+1} lacks authentic RSR data`);
          console.error(`   - Missing UPC: ${!upc}`);
          console.error(`   - Missing Name: ${!name}`);
          console.error(`   - Product ID: ${it.productId || 'none'}`);
          console.error(`   - SKU: ${sku || 'none'}`);
          throw new Error(`Order blocked: Item ${idx+1} missing authentic RSR data (UPC: ${upc || 'missing'}, Name: ${name || 'missing'})`);
        }
      } catch (error) {
        console.error(`❌ Product lookup failed for item ${idx+1}:`, error);
        throw new Error(`Order blocked: Cannot verify authentic RSR data for item ${idx+1}: ${error.message}`);
      }
    }

    const qty = Number(firstNonEmpty(it.qty, it.quantity, it.count, 1));
    const price = Number(firstNonEmpty(
      it.price, it.unitPrice, it.unit_price,
      it.retail, it.pricingSnapshot?.retail, 0
    ));

    // Generate image URL using authentic UPC (no synthetic UPCs allowed)
    let imageUrl = String(firstNonEmpty(it.imageUrl, it.product?.imageUrl, '') || '');
    if (!imageUrl.startsWith('/images/')) {
      imageUrl = `/images/${upc}.jpg`; // UPC is guaranteed authentic at this point
    }

    return { upc, mpn, sku, name, qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
             price: Number.isFinite(price) && price >= 0 ? price : 0,
             imageUrl };
    }));
  } catch (error: any) {
    // Return structured error response for blocked orders
    console.error('Order blocked due to data validation:', error.message);
    return res.status(422).json({ 
      error: 'Order blocked: Missing authentic RSR data',
      details: error.message,
      requiresAuth: 'All items must have authentic UPC and product name from RSR database'
    });
  }

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