// server/routes/orderSummaryById.js
// GET /api/orders/:orderId/summary  — v1 "never-block" reader
// Reads the saved snapshot, normalizes fields, fills defaults, and returns a stable payload.

const express = require('express');
const { readSnapshot, writeSnapshot } = require('../lib/storage');
const { splitOutcomes } = require('../lib/shippingSplit');
const { mintOrderNumber } = require('../lib/orderNumbers');
const { storage } = require('../storage');

const router = express.Router();

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = (typeof v === 'string') ? v.trim() : v;
    if (s !== '' && s !== false) return s;
  }
  return undefined;
}

router.get('/api/orders/:orderId/summary', async (req, res) => {
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

  // Use only real product data from snapshot - ZERO FALLBACKS
  const rawItems = Array.isArray(snap.items) ? snap.items : [];
  if (!rawItems.length) {
    return res.status(422).json({ error: 'No items in order snapshot' });
  }
  
  // ENRICHMENT: Detect and fix old placeholder data before validation
  let needsEnrichment = false;
  for (let idx = 0; idx < rawItems.length; idx++) {
    const it = rawItems[idx];
    const name = firstNonEmpty(it.name, it.title, it.product?.name);
    const upc = firstNonEmpty(it.upc, it.UPC, it.upc_code);
    
    // Check for placeholder data that needs enrichment
    if (!name || name.startsWith('UNKNOWN') || upc?.startsWith('UNKNOWN')) {
      needsEnrichment = true;
      
      try {
        // Look up real product data by UPC or SKU
        let product = null;
        const lookupUpc = firstNonEmpty(it.upc, it.UPC, it.upc_code);
        const lookupSku = firstNonEmpty(it.sku, it.SKU);
        
        if (lookupUpc && !lookupUpc.startsWith('UNKNOWN')) {
          const products = await storage.getProductsByUpc(lookupUpc);
          product = products && products.length > 0 ? products[0] : null;
        } else if (lookupSku) {
          product = await storage.getProductBySku(lookupSku);
        }
        
        if (product) {
          // Enrich the item with real product data
          rawItems[idx] = {
            ...it,
            upc: product.upcCode || lookupUpc,
            mpn: product.manufacturerPartNumber || it.mpn,
            sku: product.sku || lookupSku,
            name: product.name,
            imageUrl: `/images/${product.sku}.jpg`,
            product: {
              ...it.product,
              upc: product.upcCode,
              mpn: product.manufacturerPartNumber,
              sku: product.sku,
              name: product.name,
              imageUrl: `/images/${product.sku}.jpg`
            }
          };
        }
      } catch (error) {
        console.error(`Failed to enrich item ${idx + 1} for order ${orderId}:`, error);
        // Continue without enrichment for this item
      }
    }
  }
  
  // Save enriched data back to snapshot if any changes were made
  if (needsEnrichment) {
    snap.items = rawItems;
    snap.enrichedAt = new Date().toISOString();
    snap.updatedAt = new Date().toISOString();
    writeSnapshot(orderId, snap);
  }
  
  // Validate all items first - fail fast if any item is invalid
  for (let idx = 0; idx < rawItems.length; idx++) {
    const it = rawItems[idx];
    const name = firstNonEmpty(it.name, it.title, it.product?.name);
    if (!name) {
      return res.status(422).json({ error: `Item ${idx + 1}: Product name missing from snapshot. No fallbacks allowed.` });
    }
    
    const qty = Number(firstNonEmpty(it.qty, it.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(422).json({ error: `Item ${idx + 1}: Invalid quantity in snapshot.` });
    }
    
    const unit = Number(firstNonEmpty(it.price, it.unitPrice, it.retail, it.pricingSnapshot?.retail));
    if (!Number.isFinite(unit) || unit < 0) {
      return res.status(422).json({ error: `Item ${idx + 1}: Invalid price in snapshot.` });
    }

    const imageUrl = firstNonEmpty(it.imageUrl, it.product?.imageUrl);
    if (!imageUrl || !imageUrl.startsWith('/images/')) {
      return res.status(422).json({ error: `Item ${idx + 1}: Invalid or missing image URL in snapshot.` });
    }
  }
  
  // All items are valid - build the normalized items
  const normItems = rawItems.map((it, idx) => {
    const upc = String(firstNonEmpty(it.upc, it.UPC, it.upc_code, it.product?.upc) || '');
    const mpn = String(firstNonEmpty(it.mpn, it.MPN, it.MNP, it.product?.mpn) || '');
    const sku = String(firstNonEmpty(it.sku, it.SKU, it.product?.sku) || '');
    const name = firstNonEmpty(it.name, it.title, it.product?.name); // Already validated
    const qty = Number(firstNonEmpty(it.qty, it.quantity)); // Already validated
    const unit = Number(firstNonEmpty(it.price, it.unitPrice, it.retail, it.pricingSnapshot?.retail)); // Already validated
    const imageUrl = firstNonEmpty(it.imageUrl, it.product?.imageUrl); // Already validated

    // Build a line with validated real data only
    return {
      qty,
      pricingSnapshot: { retail: unit },
      unitPrice: unit,
      extendedPrice: round2(unit * qty),
      product: {
        sku, upc, mpn, name,
        image: { url: imageUrl },
        imageUrl,   // product-level alias
        UPC: upc, MPN: mpn, SKU: sku, NAME: name // uppercase aliases some code paths use
      },
      // line-level aliases (many legacy components look here)
      sku, upc, mpn, name, imageUrl
    };
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