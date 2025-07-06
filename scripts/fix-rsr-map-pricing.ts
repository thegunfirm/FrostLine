/**
 * Fix RSR MAP Pricing - Comprehensive Update
 * Updates all products with correct MSRP and MAP values from RSR file
 */

import { readFileSync } from 'fs';
import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Parse RSR inventory line (77 fields)
 */
function parseRSRLine(line: string) {
  const fields = line.split(';');
  if (fields.length < 77) return null;

  return {
    stockNo: fields[0]?.trim() || '',
    description: fields[2]?.trim() || '',
    departmentNumber: fields[3]?.trim() || '',
    msrp: parseFloat(fields[5]?.trim() || '0'),     // MSRP at position 5
    wholesale: parseFloat(fields[6]?.trim() || '0'), // Wholesale at position 6
    map: parseFloat(fields[70]?.trim() || '0'),     // MAP at position 70
    quantity: parseInt(fields[8]?.trim() || '0')
  };
}

/**
 * Fix RSR MAP pricing for all products
 */
async function fixRSRMAPPricing() {
  console.log('🔄 Starting comprehensive RSR MAP pricing fix...');
  
  try {
    const fileContent = readFileSync('server/data/rsr/downloads/rsrinventory-new.txt', 'utf-8');
    const lines = fileContent.split('\n');
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const rsrProduct = parseRSRLine(line);
      if (!rsrProduct || !rsrProduct.stockNo) {
        skipped++;
        continue;
      }
      
      const { stockNo, msrp, wholesale, map } = rsrProduct;
      
      if (msrp === 0 || wholesale === 0) {
        skipped++;
        continue;
      }
      
      // Use MAP if available and different from MSRP, otherwise use MSRP
      const mapPrice = map > 0 ? map : msrp;
      
      try {
        const result = await db
          .update(products)
          .set({
            priceMsrp: msrp,
            priceMap: mapPrice,
            priceWholesale: wholesale,
            priceBronze: msrp,      // Bronze = MSRP
            priceGold: mapPrice,    // Gold = MAP
            updatedAt: new Date()
          })
          .where(eq(products.sku, stockNo));
        
        updated++;
        
        if (processed % 1000 === 0) {
          console.log(`📊 Processed ${processed}, Updated ${updated}, Skipped ${skipped}`);
        }
        
      } catch (error) {
        console.error(`Error updating ${stockNo}:`, error);
        skipped++;
      }
      
      processed++;
    }
    
    console.log(`✅ RSR MAP pricing fix complete:`);
    console.log(`   📊 Processed: ${processed} products`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ⏭️ Skipped: ${skipped} products`);
    
    // Show sample of updated products
    const sampleResults = await db.select({
      sku: products.sku,
      name: products.name,
      wholesale: products.priceWholesale,
      msrp: products.priceMsrp,
      map: products.priceMap,
      bronze: products.priceBronze,
      gold: products.priceGold
    }).from(products).limit(10);
    
    console.log('\n📋 Sample of updated products:');
    sampleResults.forEach(product => {
      console.log(`${product.sku}: MSRP $${product.msrp}, MAP $${product.map}, Bronze $${product.bronze}, Gold $${product.gold}`);
    });
    
  } catch (error) {
    console.error('❌ Error in RSR MAP pricing fix:', error);
  }
}

// Run the fix
fixRSRMAPPricing();