/**
 * Fast SKU Fix - Process remaining corruption in smaller, faster batches
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function fastSKUFix() {
  console.log('⚡ Fast SKU fix starting...');
  
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
  
  console.log(`✅ RSR lookup built: ${rsrData.size} products`);

  // Process in small batches
  let totalProcessed = 0;
  let totalCorrected = 0;
  
  for (let i = 0; i < 10; i++) { // Process 10 batches
    const batch = await db.select()
      .from(products)
      .where(eq(products.sku, products.rsrStockNumber))
      .limit(500);
    
    if (batch.length === 0) break;
    
    let batchCorrected = 0;
    
    for (const product of batch) {
      const manufacturerPart = rsrData.get(product.rsrStockNumber);
      
      if (manufacturerPart && manufacturerPart !== product.rsrStockNumber) {
        await db.update(products)
          .set({ sku: manufacturerPart })
          .where(eq(products.id, product.id));
        batchCorrected++;
      }
    }
    
    totalProcessed += batch.length;
    totalCorrected += batchCorrected;
    
    console.log(`Batch ${i + 1}: ${batchCorrected}/${batch.length} corrected (Total: ${totalCorrected})`);
  }
  
  // Final check
  const remaining = await db.select().from(products).where(eq(products.sku, products.rsrStockNumber));
  const total = await db.select().from(products);
  const fixed = total.length - remaining.length;
  const percent = ((fixed / total.length) * 100).toFixed(2);
  
  console.log(`\n📊 Status: ${fixed}/${total.length} (${percent}%) - ${remaining.length} remaining`);
}

fastSKUFix().then(() => process.exit(0)).catch(console.error);