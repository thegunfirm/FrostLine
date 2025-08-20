/**
 * Targeted fix for the remaining corrupted products
 * These all have manufacturer parts available but weren't fixed
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function targetedRemainingFix() {
  console.log('🎯 Targeted fix for remaining corrupted products...');
  
  // Load RSR lookup
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, string>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0] && fields[11]?.trim()) {
      rsrData.set(fields[0].trim(), fields[11].trim());
    }
  }
  
  console.log(`✅ RSR lookup built: ${rsrData.size} products`);

  // Get all remaining corrupted products
  const corrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  console.log(`📊 Found ${corrupted.length} corrupted products to fix`);
  
  // Get existing SKUs to avoid conflicts
  const existingProducts = await db.select({ sku: products.sku }).from(products);
  const usedSKUs = new Set(existingProducts.map(p => p.sku));
  
  let totalFixed = 0;
  let totalSkipped = 0;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < corrupted.length; i += batchSize) {
    const batch = corrupted.slice(i, i + batchSize);
    
    for (const product of batch) {
      const manufacturerPart = rsrData.get(product.rsrStockNumber);
      
      if (manufacturerPart && manufacturerPart !== product.rsrStockNumber) {
        let targetSKU = manufacturerPart;
        let suffix = 1;
        
        // Handle duplicates
        while (usedSKUs.has(targetSKU)) {
          targetSKU = `${manufacturerPart}-${suffix}`;
          suffix++;
        }
        
        try {
          await db.update(products)
            .set({ sku: targetSKU })
            .where(eq(products.id, product.id));
          
          usedSKUs.add(targetSKU);
          totalFixed++;
          
          if (totalFixed % 50 === 0) {
            console.log(`Progress: ${totalFixed} fixed...`);
          }
        } catch (error) {
          console.log(`⚠️ Error fixing ${product.rsrStockNumber}: ${error.message}`);
          totalSkipped++;
        }
      } else {
        totalSkipped++;
      }
    }
  }
  
  // Final verification
  const finalCorrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
    
  const totalProducts = await db.select().from(products);
  const finalFixed = totalProducts.length - finalCorrupted.length;
  const finalPercent = ((finalFixed / totalProducts.length) * 100).toFixed(2);
  
  console.log(`\n🎊 TARGETED FIX COMPLETE!`);
  console.log(`📊 FINAL STATUS:`);
  console.log(`   Total products: ${totalProducts.length}`);
  console.log(`   Properly separated: ${finalFixed} (${finalPercent}%)`);
  console.log(`   Still corrupted: ${finalCorrupted.length}`);
  console.log(`   This run fixed: ${totalFixed}`);
  console.log(`   This run skipped: ${totalSkipped}`);
  
  if (finalCorrupted.length === 0) {
    console.log('🎉 100% FIELD 12 CORRUPTION FIXED!');
  } else if (finalCorrupted.length < 100) {
    console.log(`🔍 Only ${finalCorrupted.length} remain - showing details:`);
    for (const product of finalCorrupted.slice(0, 10)) {
      const rsrInfo = rsrData.get(product.rsrStockNumber);
      console.log(`   ${product.rsrStockNumber} | ${product.name} | Mfg Part: "${rsrInfo || 'MISSING'}"`);
    }
  }
}

targetedRemainingFix().then(() => process.exit(0)).catch(console.error);