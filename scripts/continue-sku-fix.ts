/**
 * Continue SKU Fix - Process remaining corrupted inventory
 * Optimized to run in batches and complete faster
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function continueSKUFix() {
  console.log('🔧 Continuing SKU corruption fix...');
  
  // Build RSR lookup map quickly
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, string>();
  
  console.log('📋 Building RSR lookup...');
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0] && fields[11]) {
      rsrData.set(fields[0].trim(), fields[11].trim()); // RSR code -> Manufacturer part
    }
  }
  
  console.log(`✅ Built lookup for ${rsrData.size} products`);

  // Get remaining corrupted products in batches
  let offset = 0;
  const batchSize = 1000;
  let totalCorrected = 0;
  
  while (true) {
    console.log(`🔍 Processing batch starting at ${offset}...`);
    
    const corruptedBatch = await db.select()
      .from(products)
      .where(eq(products.sku, products.rsrStockNumber))
      .limit(batchSize)
      .offset(offset);
    
    if (corruptedBatch.length === 0) {
      console.log('✅ No more corrupted products found');
      break;
    }

    let batchCorrected = 0;
    const usedSKUs = new Set<string>();
    
    // Get existing SKUs to avoid conflicts
    const existing = await db.select({ sku: products.sku }).from(products);
    existing.forEach(p => usedSKUs.add(p.sku));

    for (const product of corruptedBatch) {
      const manufacturerPart = rsrData.get(product.rsrStockNumber);
      
      if (manufacturerPart && manufacturerPart !== product.rsrStockNumber) {
        let targetSKU = manufacturerPart;
        let suffix = 1;
        
        // Handle duplicates
        while (usedSKUs.has(targetSKU)) {
          targetSKU = `${manufacturerPart}-${suffix}`;
          suffix++;
        }
        
        await db.update(products)
          .set({ sku: targetSKU })
          .where(eq(products.id, product.id));
        
        usedSKUs.add(targetSKU);
        batchCorrected++;
      }
    }
    
    totalCorrected += batchCorrected;
    console.log(`📊 Batch complete: ${batchCorrected}/${corruptedBatch.length} corrected (Total: ${totalCorrected})`);
    
    if (corruptedBatch.length < batchSize) {
      break;
    }
    
    offset += batchSize;
  }

  // Final status check
  const remaining = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
    
  console.log(`\n🎉 SKU Fix Complete!`);
  console.log(`📈 Total corrected this run: ${totalCorrected}`);
  console.log(`🔍 Remaining corrupted: ${remaining.length}`);
  
  if (remaining.length === 0) {
    console.log('🎉 ALL FIELD 12 CORRUPTION FIXED!');
  } else {
    console.log(`⚠️ ${remaining.length} products still need review (likely missing manufacturer parts)`);
  }
}

continueSKUFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });