/**
 * Final Push to 100% - Complete the remaining corruption fixes
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function finalPushTo100() {
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
  
  // Get existing SKUs
  const existingProducts = await db.select({ sku: products.sku }).from(products);
  const usedSKUs = new Set(existingProducts.map(p => p.sku));
  
  console.log(`🎯 Final push - RSR lookup: ${rsrData.size}, existing SKUs: ${usedSKUs.size}`);

  // Process remaining in smaller chunks
  let totalCorrected = 0;
  
  for (let i = 0; i < 15; i++) {
    const batch = await db.select()
      .from(products)
      .where(eq(products.sku, products.rsrStockNumber))
      .limit(300);
    
    if (batch.length === 0) break;
    
    let batchCorrected = 0;
    
    for (const product of batch) {
      const manufacturerPart = rsrData.get(product.rsrStockNumber);
      
      if (manufacturerPart && manufacturerPart !== product.rsrStockNumber) {
        let targetSKU = manufacturerPart;
        let suffix = 1;
        
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
          // Skip on error
        }
      }
    }
    
    totalCorrected += batchCorrected;
    console.log(`Batch ${i + 1}: +${batchCorrected} (Total: ${totalCorrected})`);
  }
  
  // Final check
  const remaining = await db.select().from(products).where(eq(products.sku, products.rsrStockNumber));
  const total = await db.select().from(products);
  const fixed = total.length - remaining.length;
  const percent = ((fixed / total.length) * 100).toFixed(2);
  
  console.log(`\n🎊 FINAL: ${fixed}/${total.length} (${percent}%) - ${remaining.length} remaining`);
  
  if (remaining.length === 0) {
    console.log('🎉 100% FIELD 12 CORRUPTION FIXED!');
  }
}

finalPushTo100().then(() => process.exit(0)).catch(console.error);