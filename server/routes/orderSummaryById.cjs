// server/routes/orderSummaryById.js
// GET /api/orders/:orderId/summary  — v1 "never-block" reader
// Reads the saved snapshot, normalizes fields, fills defaults, and returns a stable payload.

const express = require('express');
const { readSnapshot, writeSnapshot } = require('../lib/order-storage');
const { splitOutcomes } = require('../lib/shippingSplit');
const { mintOrderNumber } = require('../lib/orderNumbers');
const { storage } = require('../storage.ts');

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
  let actualItemsChanged = 0;
  for (let idx = 0; idx < rawItems.length; idx++) {
    const it = rawItems[idx];
    const name = firstNonEmpty(it.name, it.title, it.product?.name);
    const upc = firstNonEmpty(it.upc, it.UPC, it.upc_code);
    
    // Check for placeholder data that needs enrichment
    if (!name || name.startsWith('UNKNOWN') || upc?.startsWith('UNKNOWN')) {
      needsEnrichment = true;
      
      try {
        // Look up real product data by UPC or MPN (not SKU)
        let product = null;
        const lookupUpc = firstNonEmpty(it.upc, it.UPC, it.upc_code);
        const lookupMpn = firstNonEmpty(it.mpn, it.MPN, it.manufacturerPartNumber);
        
        if (lookupUpc && !lookupUpc.startsWith('UNKNOWN')) {
          product = await storage.getProductByUpc(lookupUpc);
        } else if (lookupMpn && !lookupMpn.startsWith('UNKNOWN')) {
          product = await storage.getProductByMpn(lookupMpn);
        }
        
        if (product) {
          // CRITICAL: Only replace placeholder data, NEVER overwrite authentic values
          const enrichedItem = { ...it };
          let actuallyChanged = false;
          
          // Only update name if it's a placeholder
          if (!name || name.startsWith('UNKNOWN') || name.includes('Product name missing')) {
            enrichedItem.name = product.name;
            actuallyChanged = true;
          }
          
          // Only update UPC if it's a placeholder  
          if (!upc || upc.startsWith('UNKNOWN')) {
            enrichedItem.upc = product.upcCode || lookupUpc;
            actuallyChanged = true;
          }
          
          // Only update image if using placeholder
          if (it.imageUrl?.includes('placeholder') || !it.imageUrl) {
            enrichedItem.imageUrl = `/images/${product.upcCode}.jpg`;
            actuallyChanged = true;
          }
          
          // Update product sub-object only for placeholder fields
          if (it.product && actuallyChanged) {
            enrichedItem.product = {
              ...it.product,
              upc: (!it.product.upc || it.product.upc.startsWith('UNKNOWN')) ? product.upcCode : it.product.upc,
              name: (!it.product.name || it.product.name.startsWith('UNKNOWN')) ? product.name : it.product.name,
              mpn: it.product.mpn || product.manufacturerPartNumber,
              imageUrl: (it.product.imageUrl?.includes('placeholder') || !it.product.imageUrl) ? `/images/${product.upcCode}.jpg` : it.product.imageUrl
            };
          }
          
          if (actuallyChanged) {
            rawItems[idx] = enrichedItem;
            actualItemsChanged++;
          }
        }
      } catch (error) {
        console.error(`Failed to enrich item ${idx + 1} for order ${orderId}:`, error);
        // Continue without enrichment for this item
      }
    }
  }
  
  // Save enriched data back to snapshot ONLY if actual changes were made
  if (actualItemsChanged > 0) {
    snap.items = rawItems;
    snap.enrichedAt = new Date().toISOString();
    snap.updatedAt = new Date().toISOString();
    writeSnapshot(orderId, snap);
    console.log(`✅ Order ${orderId}: Enriched ${actualItemsChanged} items with authentic RSR data`);
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
        sku, upc, name,
        image: { url: imageUrl },
        imageUrl,   // product-level alias  
        UPC: upc, SKU: sku, NAME: name // uppercase aliases some code paths use (MPN removed)
      },
      // line-level aliases (many legacy components look here) - MPN removed
      sku, upc, name, imageUrl
    };
  });

  // FIXED: Split items by shipping outcome (FFL vs non-FFL)
  const parts = (minted.parts.length ? minted.parts : [{ outcome: outcomes[0], orderNumber: minted.main }]);
  
  // Helper function to get shipping outcome for each item based on product data
  const getShippingOutcome = async (item) => {
    let upc; // Hoist to function scope for catch block access
    try {
      upc = item.upc || item.product?.upc;
      if (upc) {
        const product = await storage.getProductByUpc(upc);
        
        // Conservative fallback for compliance - unknown products must go to FFL
        if (!product) {
          console.warn(`⚠️ Product not found for UPC ${upc} - defaulting to IH>FFL for compliance safety`);
          return 'IH>FFL';
        }
        
        const requiresFFL = (product?.requiresFFL === true) || ((product && product.requires_ffl) === true);
        const dropShippable = (product?.dropShippable === true) || ((product && product.drop_shippable) === true);
        
        // Determine shipping outcome based on product properties
        let outcome;
        if (dropShippable && requiresFFL) outcome = 'DS>FFL';
        else if (dropShippable && !requiresFFL) outcome = 'DS>Customer'; 
        else if (!dropShippable && requiresFFL) outcome = 'IH>FFL';
        else outcome = 'IH>Customer';
        
        console.log(`🎯 Shipping: ${upc} → ${product?.name || 'Not Found'} → DS:${dropShippable} FFL:${requiresFFL} → ${outcome}`);
        return outcome;
      }
      console.warn(`⚠️ Missing UPC for item - defaulting to IH>FFL for compliance safety`);
      return 'IH>FFL'; // Conservative fallback for compliance
    } catch (error) {
      console.error('Error determining shipping outcome:', error);
      console.warn(`⚠️ Product lookup failed for UPC ${upc ?? 'unknown'} - defaulting to IH>FFL for compliance safety`);
      return 'IH>FFL'; // Conservative fallback for compliance
    }
  };
  
  // FIXED: Split items by shipping outcome and create proper shipments
  // Step 1: Determine shipping outcome for each item
  const itemsWithOutcomes = await Promise.all(normItems.map(async (item) => {
    const outcome = await getShippingOutcome(item);
    return { item, outcome };
  }));
  
  // Step 2: Group items by shipping outcome
  const outcomeGroups = {};
  for (const { item, outcome } of itemsWithOutcomes) {
    if (!outcomeGroups[outcome]) {
      outcomeGroups[outcome] = [];
    }
    outcomeGroups[outcome].push(item);
  }
  
  // Step 3: Create shipments for each unique outcome
  const shipments = [];
  
  // Build outcome-to-orderNumber mapping deterministically by outcome value
  const outcomeToOrderNumber = Object.fromEntries(
    minted.parts.map(part => [part.outcome, part.orderNumber])
  );
  
  let shipmentIdx = 0;
  for (const [outcome, items] of Object.entries(outcomeGroups)) {
    const orderNumber = outcomeToOrderNumber[outcome] || minted.main;
    
    // Create shipment object
    const shipment = {
      idx: shipmentIdx,
      outcome,
      orderNumber,
      lines: items, // Only items for this specific outcome
      totals: computeTotals(items)
    };
    
    // Add FFL information if this is an FFL shipment
    if (outcome === 'DS>FFL' || outcome === 'IH>FFL') {
      // Check if FFL info is in the snapshot
      if (snap.fflId || snap.fflRecipientId) {
        const fflId = snap.fflId || snap.fflRecipientId;
        try {
          const fflData = await storage.getFFL(fflId);
          if (fflData) {
            shipment.ffl = {
              id: fflData.id,
              name: fflData.licenseName || fflData.businessName,
              address1: fflData.premiseAddress,
              city: fflData.premiseCity,
              state: fflData.premiseState,
              zip: fflData.premiseZip
            };
          }
        } catch (error) {
          console.error(`Failed to fetch FFL ${fflId}:`, error);
        }
      }
      
      // Also check fulfillmentGroups if present
      if (!shipment.ffl && snap.fulfillmentGroups) {
        for (const group of snap.fulfillmentGroups) {
          if (group.fflId) {
            try {
              const fflData = await storage.getFFL(group.fflId);
              if (fflData) {
                shipment.ffl = {
                  id: fflData.id,
                  name: fflData.licenseName || fflData.businessName,
                  address1: fflData.premiseAddress,
                  city: fflData.premiseCity,
                  state: fflData.premiseState,
                  zip: fflData.premiseZip
                };
                break; // Use the first FFL found
              }
            } catch (error) {
              console.error(`Failed to fetch FFL ${group.fflId}:`, error);
            }
          }
        }
      }
    }
    
    shipments.push(shipment);
    shipmentIdx++;
  }

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