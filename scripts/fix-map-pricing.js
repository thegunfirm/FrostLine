/**
 * Fix MAP Pricing Issue - Parse RSR data correctly to get MAP field from position 62
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import ws from 'ws';
import { readFileSync, existsSync } from 'fs';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { products } });

/**
 * Parse RSR inventory line correctly - MAP is at field position 62
 */
function parseRSRLine(line) {
  const fields = line.split(';');
  if (fields.length < 77) return null;

  return {
    stockNo: fields[0]?.trim() || '',
    description: fields[2]?.trim() || '',
    msrp: parseFloat(fields[5]?.trim() || '0'),      // Field 5: MSRP
    wholesale: parseFloat(fields[6]?.trim() || '0'),  // Field 6: Wholesale
    map: parseFloat(fields[62]?.trim() || '0')        // Field 62: MAP
  };
}

async function fixMAPPricing() {
  console.log('🔄 Fixing MAP pricing from RSR data...');
  
  // Check if RSR inventory file exists
  const rsrFilePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  if (!existsSync(rsrFilePath)) {
    console.log('❌ RSR inventory file not found');
    process.exit(1);
  }

  // Parse RSR file
  const fileContent = readFileSync(rsrFilePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  console.log(`📄 Processing ${lines.length} RSR records...`);
  
  let updated = 0;
  let mapFixed = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const rsrProduct = parseRSRLine(line);
    if (!rsrProduct || !rsrProduct.stockNo) continue;
    
    // Check if we have this product in our database
    const existingProduct = await db.select().from(products).where(eq(products.sku, rsrProduct.stockNo));
    
    if (existingProduct.length > 0) {
      const product = existingProduct[0];
      const currentMAP = parseFloat(product.priceMap || '0');
      
      // Update if MAP is different from RSR data
      if (rsrProduct.map > 0 && rsrProduct.map !== currentMAP) {
        await db.update(products)
          .set({
            priceMsrp: rsrProduct.msrp.toFixed(2),
            priceMap: rsrProduct.map.toFixed(2),
            priceWholesale: rsrProduct.wholesale.toFixed(2),
            priceBronze: rsrProduct.msrp.toFixed(2),  // Bronze = MSRP
            priceGold: rsrProduct.map.toFixed(2)      // Gold = MAP
          })
          .where(eq(products.id, product.id));
        
        mapFixed++;
        if (mapFixed <= 10) {
          console.log(`✅ ${rsrProduct.stockNo}: MSRP=${rsrProduct.msrp.toFixed(2)}, MAP=${rsrProduct.map.toFixed(2)}`);
        }
      }
      
      updated++;
      if (updated % 1000 === 0) {
        console.log(`📊 Processed ${updated} products, fixed ${mapFixed} MAP prices...`);
      }
    }
  }
  
  console.log(`✅ Complete: ${updated} products processed, ${mapFixed} MAP prices fixed`);
  
  // Test the specific products mentioned
  const testProducts = ['ZAFZP23BSS', 'ZASZR7762LM'];
  for (const sku of testProducts) {
    const product = await db.select().from(products).where(eq(products.sku, sku));
    if (product.length > 0) {
      const p = product[0];
      console.log(`\n📋 ${sku}:`);
      console.log(`   MSRP: $${p.priceMsrp}`);
      console.log(`   MAP: $${p.priceMap}`);
      console.log(`   Bronze: $${p.priceBronze}`);
      console.log(`   Gold: $${p.priceGold}`);
    }
  }
  
  process.exit(0);
}

fixMAPPricing().catch(error => {
  console.error('❌ MAP pricing fix failed:', error);
  process.exit(1);
});