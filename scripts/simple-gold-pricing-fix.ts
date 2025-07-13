/**
 * Simple Gold Pricing Fix
 * Efficiently fixes Gold pricing discounts without Algolia sync
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function simpleGoldPricingFix() {
  console.log('🔄 Starting simple Gold pricing fix...');
  
  try {
    // Get all RSR products
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    console.log(`📊 Total RSR products: ${allProducts.length}`);

    // Filter for products with matching Bronze and Gold pricing
    const matchingProducts = allProducts.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      return bronzePrice > 0 && goldPrice > 0 && bronzePrice === goldPrice;
    });

    console.log(`📊 Found ${matchingProducts.length} products with matching Bronze/Gold pricing`);

    if (matchingProducts.length === 0) {
      console.log('✅ No products found with matching Bronze/Gold pricing. All pricing looks correct.');
      return;
    }

    // Department-specific discount rates
    const departmentDiscounts = {
      '01': 0.05, // Handguns - 5% discount
      '05': 0.05, // Long Guns - 5% discount  
      '06': 0.05, // NFA - 5% discount
      '08': 0.05, // Optics - 5% discount
      '18': 0.05, // Ammunition - 5% discount
      '34': 0.05, // Parts - 5% discount
      'default': 0.05 // Default 5% discount
    };

    let updated = 0;
    let errors = 0;
    const batchSize = 100;
    const totalBatches = Math.ceil(matchingProducts.length / batchSize);

    console.log('🔄 Processing in batches...');

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, matchingProducts.length);
      const batch = matchingProducts.slice(start, end);

      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} products)`);

      for (const product of batch) {
        try {
          const bronzePrice = parseFloat(product.priceBronze || '0');
          const department = product.departmentNumber || 'default';
          const discount = departmentDiscounts[department] || departmentDiscounts['default'];
          
          // Calculate new Gold price with discount
          const newGoldPrice = bronzePrice * (1 - discount);
          
          // Update database
          await db.update(products)
            .set({
              priceGold: newGoldPrice.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));

          updated++;
          
        } catch (error: any) {
          errors++;
          console.error(`❌ Error updating ${product.sku}:`, error.message);
        }
      }

      // Progress update
      console.log(`📊 Batch ${i + 1} complete: ${updated}/${matchingProducts.length} updated, ${errors} errors`);
    }

    console.log(`✅ Database update complete:`);
    console.log(`   📊 Products processed: ${matchingProducts.length}`);
    console.log(`   ✅ Products updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Show sample results
    console.log('\n📋 Sample of updated products:');
    const sampleProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        departmentNumber: products.departmentNumber,
        priceBronze: products.priceBronze,
        priceGold: products.priceGold
      })
      .from(products)
      .where(eq(products.distributor, 'RSR'))
      .limit(10);

    sampleProducts.forEach(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      const savings = bronzePrice - goldPrice;
      const savingsPercent = bronzePrice > 0 ? ((savings / bronzePrice) * 100).toFixed(1) : '0.0';
      
      console.log(`${product.sku}: ${product.name.substring(0, 50)}...`);
      console.log(`  Dept: ${product.departmentNumber} | Bronze: $${product.priceBronze} | Gold: $${product.priceGold} | Savings: $${savings.toFixed(2)} (${savingsPercent}%)`);
    });

    // Final verification
    const finalProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    const remainingMatching = finalProducts.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      return bronzePrice > 0 && goldPrice > 0 && bronzePrice === goldPrice;
    });

    console.log(`\n🔍 Final verification: ${remainingMatching.length} products still have matching Bronze/Gold pricing`);
    
  } catch (error: any) {
    console.error('❌ Error in simple Gold pricing fix:', error);
  }
}

// Run the fix
simpleGoldPricingFix().catch(console.error);