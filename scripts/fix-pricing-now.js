/**
 * Fix Pricing Issue - Recalculate Bronze=MSRP and Gold=MAP for all products
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { products } });

async function fixPricing() {
  console.log('🔄 Starting pricing fix...');
  
  // Get all products with pricing data
  const allProducts = await db.select().from(products);
  console.log(`Found ${allProducts.length} products`);
  
  let updated = 0;
  let fixed = 0;
  
  for (const product of allProducts) {
    if (product.priceWholesale && product.priceMsrp && product.priceMap) {
      const wholesale = parseFloat(product.priceWholesale);
      const msrp = parseFloat(product.priceMsrp);
      const map = parseFloat(product.priceMap);
      
      // Calculate correct tier pricing
      const bronze = msrp;  // Bronze = MSRP
      const gold = map;     // Gold = MAP
      const platinum = wholesale * 1.02; // Platinum = Wholesale + 2% markup
      
      // Update the product
      await db.update(products)
        .set({
          priceBronze: bronze.toFixed(2),
          priceGold: gold.toFixed(2),
          pricePlatinum: platinum.toFixed(2)
        })
        .where(eq(products.id, product.id));
      
      updated++;
      
      // Check if we actually fixed a pricing issue
      if (product.priceBronze !== bronze.toFixed(2) || product.priceGold !== gold.toFixed(2)) {
        fixed++;
        if (fixed <= 5) {
          console.log(`Fixed ${product.name}: Bronze=${bronze.toFixed(2)}, Gold=${gold.toFixed(2)}`);
        }
      }
      
      if (updated % 1000 === 0) {
        console.log(`Updated ${updated} products...`);
      }
    }
  }
  
  console.log(`✅ Pricing fix complete - updated ${updated} products, fixed ${fixed} pricing issues`);
  
  // Test the specific product mentioned by user
  const testProduct = await db.select().from(products).where(eq(products.sku, 'ZASZR7762LM'));
  if (testProduct.length > 0) {
    const p = testProduct[0];
    console.log(`\n📋 Test Product ZASZR7762LM:`);
    console.log(`   MSRP: $${p.priceMsrp}`);
    console.log(`   MAP: $${p.priceMap}`);
    console.log(`   Bronze: $${p.priceBronze}`);
    console.log(`   Gold: $${p.priceGold}`);
  }
  
  process.exit(0);
}

fixPricing().catch(error => {
  console.error('❌ Pricing fix failed:', error);
  process.exit(1);
});