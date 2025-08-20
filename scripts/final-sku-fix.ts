/**
 * Final SKU Fix - Complete the remaining corruption fixes to reach 100%
 * Optimized for faster processing with larger batches
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function finalSKUFix() {
  console.log('🎯 Running final SKU corruption fix to reach 100%...');
  
  // Build RSR lookup map
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, string>();
  
  console.log('📋 Building RSR lookup...');
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0] && fields[11]) {
      rsrData.set(fields[0].trim(), fields[11].trim());
    }
  }
  
  console.log(`✅ Built lookup for ${rsrData.size} products`);

  // Process in larger batches for speed
  let offset = 0;
  const batchSize = 2000; // Increased batch size
  let totalCorrected = 0;
  let totalSkipped = 0;
  
  while (true) {
    const corruptedBatch = await db.select()
      .from(products)
      .where(eq(products.sku, products.rsrStockNumber))
      .limit(batchSize)
      .offset(offset);
    
    if (corruptedBatch.length === 0) {
      console.log('✅ No more corrupted products found');
      break;
    }

    console.log(`🔄 Processing batch ${Math.floor(offset/batchSize) + 1}: ${corruptedBatch.length} products`);

    let batchCorrected = 0;
    let batchSkipped = 0;
    const usedSKUs = new Set<string>();
    
    // Get existing SKUs to avoid conflicts
    const existing = await db.select({ sku: products.sku }).from(products);
    existing.forEach(p => usedSKUs.add(p.sku));

    // Process batch
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
      } else {
        batchSkipped++;
      }
    }
    
    totalCorrected += batchCorrected;
    totalSkipped += batchSkipped;
    
    console.log(`📊 Batch ${Math.floor(offset/batchSize) + 1}: ${batchCorrected} corrected, ${batchSkipped} skipped`);
    console.log(`📈 Running totals: ${totalCorrected} corrected, ${totalSkipped} skipped`);
    
    if (corruptedBatch.length < batchSize) {
      break;
    }
    
    offset += batchSize;
  }

  // Final status check
  const final = await db.select().from(products);
  const remaining = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
    
  const fixedCount = final.length - remaining.length;
  const fixedPercent = ((fixedCount / final.length) * 100).toFixed(2);
  
  console.log(`\n🎉 FINAL SKU FIX COMPLETE!`);
  console.log(`📊 FINAL RESULTS:`);
  console.log(`   Total products: ${final.length}`);
  console.log(`   Properly separated: ${fixedCount} (${fixedPercent}%)`);
  console.log(`   Still corrupted: ${remaining.length}`);
  console.log(`   This run corrected: ${totalCorrected}`);
  console.log(`   This run skipped: ${totalSkipped} (missing manufacturer parts)`);
  
  if (remaining.length === 0) {
    console.log('🎊 100% FIELD 12 CORRUPTION FIXED!');
  } else {
    console.log(`⚠️ ${remaining.length} products remain (missing manufacturer part numbers)`);
  }
}

finalSKUFix()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });