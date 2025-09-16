#!/usr/bin/env node

// Systematic Order Enrichment Tool
// Scans all order snapshots for placeholder data and enriches with real RSR product data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ORDERS_DIR = path.join(__dirname, '../data/orders');

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

async function scanAndEnrichOrders() {
  console.log('🔍 Scanning all order snapshots for placeholder data...\n');
  
  if (!fs.existsSync(ORDERS_DIR)) {
    console.log('❌ Orders directory not found:', ORDERS_DIR);
    return;
  }

  const files = fs.readdirSync(ORDERS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} order files to check\n`);

  let totalProcessed = 0;
  let totalEnriched = 0;
  const enrichedOrders = [];

  for (const file of files) {
    const orderId = file.replace('.json', '');
    const filePath = path.join(ORDERS_DIR, file);
    
    try {
      const snapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items = Array.isArray(snapData.items) ? snapData.items : [];
      
      if (items.length === 0) {
        console.log(`⚠️  Order ${orderId}: No items found`);
        continue;
      }

      let needsEnrichment = false;
      let enrichedItems = [];

      // Check each item for placeholder data
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const name = firstNonEmpty(item.name, item.title, item.product?.name);
        const upc = firstNonEmpty(item.upc, item.UPC, item.upc_code);
        
        // Detect placeholder data
        if (!name || name.startsWith('UNKNOWN') || name.includes('Product name missing') || 
            !upc || upc.startsWith('UNKNOWN')) {
          
          console.log(`🔧 Order ${orderId} Item ${idx + 1}: Found placeholder data`);
          console.log(`   Name: "${name}" | UPC: "${upc}"`);
          
          needsEnrichment = true;
          
          // Attempt to enrich with real product data
          let enrichedItem = { ...item };
          let product = null;
          
          const lookupUpc = firstNonEmpty(item.upc, item.UPC, item.upc_code);
          const lookupSku = firstNonEmpty(item.sku, item.SKU, item.mpn);
          
          if (lookupUpc && !lookupUpc.startsWith('UNKNOWN')) {
            const products = await storage.getProductsByUpc(lookupUpc);
            product = products && products.length > 0 ? products[0] : null;
          } else if (lookupSku && !lookupSku.startsWith('UNKNOWN')) {
            product = await storage.getProductBySku(lookupSku);
          }
          
          if (product) {
            enrichedItem = {
              ...item,
              upc: product.upcCode || lookupUpc,
              mpn: product.manufacturerPartNumber || item.mpn,
              sku: product.sku || lookupSku,
              name: product.name,
              imageUrl: `/images/${product.sku}.jpg`,
              product: {
                ...item.product,
                upc: product.upcCode,
                mpn: product.manufacturerPartNumber,
                sku: product.sku,
                name: product.name,
                imageUrl: `/images/${product.sku}.jpg`
              }
            };
            console.log(`   ✅ Enriched with: "${product.name}"`);
          } else {
            console.log(`   ❌ No product found for UPC: ${lookupUpc} | SKU: ${lookupSku}`);
          }
          
          enrichedItems.push(enrichedItem);
        } else {
          // Item already has good data
          enrichedItems.push(item);
        }
      }

      if (needsEnrichment) {
        // Update the snapshot with enriched data
        const updatedSnapshot = {
          ...snapData,
          items: enrichedItems,
          enrichedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(updatedSnapshot, null, 2));
        totalEnriched++;
        enrichedOrders.push(orderId);
        console.log(`✅ Order ${orderId}: Enrichment complete\n`);
      } else {
        console.log(`✅ Order ${orderId}: Already has authentic data\n`);
      }

      totalProcessed++;

    } catch (error) {
      console.error(`❌ Error processing order ${orderId}:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total orders processed: ${totalProcessed}`);
  console.log(`Orders enriched: ${totalEnriched}`);
  console.log(`Orders with good data: ${totalProcessed - totalEnriched}`);
  
  if (enrichedOrders.length > 0) {
    console.log(`\nEnriched orders: ${enrichedOrders.join(', ')}`);
  }
  
  console.log('\n🎉 Systematic enrichment complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scanAndEnrichOrders().catch(console.error);
}

export { scanAndEnrichOrders };