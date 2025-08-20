/**
 * Complete SKU Fix - Handle duplicates and finish the remaining 9,618 products
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function completeSKUFix() {
  console.log('🎯 Completing final 32.68% of SKU corruption fix...');
  
  // Load RSR lookup
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, string>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0] && fields[11]) {
      rsrData.set(fields[0].trim(), fields[11].trim());
    }
  }
  
  // Get existing SKUs to avoid duplicates
  const existingProducts = await db.select({ sku: products.sku }).from(products);
  const usedSKUs = new Set(existingProducts.map(p => p.sku));
  
  console.log(`✅ RSR lookup: ${rsrData.size} products, ${usedSKUs.size} existing SKUs`);

  // Process remaining corrupted products in small batches
  let totalCorrected = 0;
  let totalSkipped = 0;
  
  for (let batchNum = 1; batchNum <= 20; batchNum++) {
    const batch = await db.select()
      .from(products)
      .where(eq(products.sku, products.rsrStockNumber))
      .limit(500);
    
    if (batch.length === 0) {
      console.log('✅ No more corrupted products');
      break;
    }
    
    let batchCorrected = 0;
    let batchSkipped = 0;
    
    for (const product of batch) {
      const manufacturerPart = rsrData.get(product.rsrStockNumber);
      
      if (manufacturerPart && manufacturerPart !== product.rsrStockNumber) {
        let targetSKU = manufacturerPart;
        let suffix = 1;
        
        // Handle duplicates by adding suffix
        while (usedSKUs.has(targetSKU)) {
          targetSKU = `${manufacturerPart}-${suffix}`;
          suffix++;
        }
        
        try {
          await db.update(products)
            .set({ sku: targetSKU })
            .where(eq(products.id, product.id));
          
          usedSKUs.add(targetSKU);
          batchCorrected++;
        } catch (error) {
          console.log(`⚠️ Skipping ${product.rsrStockNumber}: ${error.message}`);
          batchSkipped++;
        }
      } else {
        batchSkipped++;
      }
    }
    
    totalCorrected += batchCorrected;
    totalSkipped += batchSkipped;
    
    console.log(`Batch ${batchNum}: ${batchCorrected} corrected, ${batchSkipped} skipped (Total: ${totalCorrected})`);
    
    // Progress check every 5 batches
    if (batchNum % 5 === 0) {
      const remaining = await db.select().from(products).where(eq(products.sku, products.rsrStockNumber));
      const total = await db.select().from(products);
      const fixed = total.length - remaining.length;
      const percent = ((fixed / total.length) * 100).toFixed(2);
      
      console.log(`📊 Progress: ${fixed}/${total.length} (${percent}%) - ${remaining.length} remaining`);
      
      if (remaining.length === 0) {
        console.log('🎉 100% COMPLETE!');
        break;
      }
    }
  }
  
  // Final status
  const finalRemaining = await db.select().from(products).where(eq(products.sku, products.rsrStockNumber));
  const finalTotal = await db.select().from(products);
  const finalFixed = finalTotal.length - finalRemaining.length;
  const finalPercent = ((finalFixed / finalTotal.length) * 100).toFixed(2);
  
  console.log(`\n🎊 FINAL RESULTS:`);
  console.log(`   Total products: ${finalTotal.length}`);
  console.log(`   Properly separated: ${finalFixed} (${finalPercent}%)`);
  console.log(`   Still corrupted: ${finalRemaining.length}`);
  console.log(`   This run corrected: ${totalCorrected}`);
  console.log(`   This run skipped: ${totalSkipped}`);
  
  if (finalRemaining.length === 0) {
    console.log('🎉 100% FIELD 12 CORRUPTION FIXED!');
  }
}

completeSKUFix().then(() => process.exit(0)).catch(console.error);