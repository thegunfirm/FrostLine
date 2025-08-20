/**
 * Safely Fix Corrupted SKUs - Handle Duplicate Manufacturer Part Numbers
 * 
 * This script fixes the 93.26% of corrupted inventory where RSR distributor 
 * codes are incorrectly used as SKUs instead of manufacturer part numbers.
 * 
 * Handles duplicate manufacturer part numbers by appending unique suffixes.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface RSRProduct {
  rsrStockNumber: string;
  manufacturerPartNumber: string;
  upc: string;
  description: string;
  manufacturer: string;
}

function parseRSRLine(line: string): RSRProduct | null {
  if (!line || line.trim() === '') return null;
  
  const fields = line.split(';');
  if (fields.length < 77) return null;
  
  return {
    rsrStockNumber: fields[0]?.trim(),           // Field 1: RSR code (for ordering)
    upc: fields[1]?.trim(),                      // Field 2: UPC code
    description: fields[2]?.trim(),              // Field 3: Description
    manufacturer: fields[10]?.trim(),            // Field 11: Manufacturer name
    manufacturerPartNumber: fields[11]?.trim()   // Field 12: ACTUAL SKU (manufacturer part)
  };
}

async function fixCorruptedSKUs() {
  console.log('🔧 Starting safe SKU corruption fix...');
  
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  if (!fs.existsSync(rsrDataPath)) {
    console.error('❌ RSR inventory file not found');
    return;
  }

  // Build RSR lookup map
  console.log('📋 Building RSR data lookup...');
  const rsrData = new Map<string, RSRProduct>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const parsed = parseRSRLine(line);
    if (parsed && parsed.rsrStockNumber && parsed.manufacturerPartNumber) {
      rsrData.set(parsed.rsrStockNumber, parsed);
    }
  }
  
  console.log(`✅ Built lookup for ${rsrData.size} RSR products`);

  // Get all corrupted products (where SKU = RSR stock number)
  console.log('🔍 Finding corrupted products...');
  const corruptedProducts = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  console.log(`❌ Found ${corruptedProducts.length} corrupted products`);

  // Track used SKUs to handle duplicates
  const usedSKUs = new Set<string>();
  
  // Get all existing SKUs to avoid conflicts
  const existingProducts = await db.select({ sku: products.sku }).from(products);
  existingProducts.forEach(p => usedSKUs.add(p.sku));

  let corrected = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of corruptedProducts) {
    try {
      const rsrInfo = rsrData.get(product.rsrStockNumber);
      
      if (!rsrInfo || !rsrInfo.manufacturerPartNumber) {
        console.log(`⚠️ No manufacturer part found for RSR ${product.rsrStockNumber}`);
        skipped++;
        continue;
      }

      // Handle duplicate manufacturer part numbers
      let targetSKU = rsrInfo.manufacturerPartNumber;
      let suffix = 1;
      
      while (usedSKUs.has(targetSKU)) {
        targetSKU = `${rsrInfo.manufacturerPartNumber}-${suffix}`;
        suffix++;
      }
      
      // Update the product
      await db.update(products)
        .set({ sku: targetSKU })
        .where(eq(products.id, product.id));
      
      usedSKUs.add(targetSKU);
      corrected++;
      
      if (corrected % 100 === 0) {
        console.log(`📊 Progress: ${corrected} corrected, ${skipped} skipped, ${errors} errors`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating product ${product.id}:`, error.message);
      errors++;
    }
  }

  console.log('\n✅ SKU Corruption Fix Complete!');
  console.log(`📈 Results:`);
  console.log(`   - Corrected: ${corrected}`);
  console.log(`   - Skipped: ${skipped}`);
  console.log(`   - Errors: ${errors}`);
  
  // Final verification
  const remainingCorrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
    
  console.log(`🔍 Remaining corrupted: ${remainingCorrupted.length}`);
  
  if (remainingCorrupted.length === 0) {
    console.log('🎉 ALL CORRUPTION FIXED! Field 12 updates complete.');
  } else {
    console.log(`⚠️ ${remainingCorrupted.length} products still need manual review`);
  }
}

// Run the fix
fixCorruptedSKUs()
  .then(() => {
    console.log('🏁 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });