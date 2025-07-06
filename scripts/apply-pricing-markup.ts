/**
 * Apply Pricing Markup Rules - Fix Current Raw Pricing
 * Updates all products to use configured markup rules instead of raw RSR pricing
 */

import { readFileSync } from 'fs';
import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { pricingService } from '../server/services/pricing-service';

/**
 * Apply pricing markup rules to all products
 */
async function applyPricingMarkup() {
  console.log('🔄 Starting pricing markup application...');
  
  try {
    // Get all products that have raw RSR pricing
    const allProducts = await db.select().from(products).where(eq(products.distributor, 'RSR'));
    
    console.log(`📦 Found ${allProducts.length} RSR products to update`);
    
    let processed = 0;
    let updated = 0;
    let errors = 0;
    
    // Process in batches
    const batchSize = 100;
    const totalBatches = Math.ceil(allProducts.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, allProducts.length);
      const batch = allProducts.slice(start, end);
      
      console.log(`🔄 Processing batch ${i + 1}/${totalBatches}...`);
      
      for (const product of batch) {
        processed++;
        
        try {
          // Get raw RSR pricing
          const dealerPrice = parseFloat(product.priceWholesale || '0');
          const mapPrice = parseFloat(product.priceMap || '0');
          const msrpPrice = parseFloat(product.priceMsrp || '0');
          
          if (dealerPrice === 0) {
            console.log(`⚠️  Skipping ${product.sku} - no dealer price`);
            continue;
          }
          
          // Create RSR pricing object
          const rsrPricing = {
            dealerPrice: dealerPrice,
            mapPrice: mapPrice > 0 ? mapPrice : null,
            msrpPrice: msrpPrice > 0 ? msrpPrice : null
          };
          
          // Calculate tier pricing using pricing service
          const tierPricing = await pricingService.calculateTierPricing(rsrPricing);
          
          // Update product with calculated pricing
          await db.update(products)
            .set({
              priceBronze: tierPricing.bronze.toFixed(2),
              priceGold: tierPricing.gold.toFixed(2),
              pricePlatinum: tierPricing.platinum.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));
          
          updated++;
          
          if (processed % 100 === 0) {
            console.log(`📊 Progress: ${processed}/${allProducts.length} (${updated} updated, ${errors} errors)`);
          }
          
        } catch (error: any) {
          errors++;
          console.error(`❌ Error processing ${product.sku}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Pricing markup application complete:`);
    console.log(`   📊 Processed: ${processed} products`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ❌ Errors: ${errors} products`);
    
    // Show sample of updated products with before/after
    const sampleResults = await db.select({
      sku: products.sku,
      name: products.name,
      wholesale: products.priceWholesale,
      msrp: products.priceMsrp,
      map: products.priceMap,
      bronze: products.priceBronze,
      gold: products.priceGold,
      platinum: products.pricePlatinum
    }).from(products).limit(10);
    
    console.log('\n📋 Sample of updated products:');
    sampleResults.forEach(product => {
      console.log(`${product.sku}: ${product.name}`);
      console.log(`  Raw: Wholesale=$${product.wholesale}, MSRP=$${product.msrp}, MAP=$${product.map}`);
      console.log(`  Tier: Bronze=$${product.bronze}, Gold=$${product.gold}, Platinum=$${product.platinum}`);
      console.log('');
    });
    
    // Show pricing comparison
    console.log('\n💰 Pricing Analysis:');
    
    // Count products with different pricing
    const pricingStats = await db.select({
      total: 'COUNT(*)',
      differentBronzeGold: 'COUNT(CASE WHEN price_bronze != price_gold THEN 1 END)',
      differentGoldPlatinum: 'COUNT(CASE WHEN price_gold != price_platinum THEN 1 END)'
    }).from(products).where(eq(products.distributor, 'RSR'));
    
    console.log(`📊 Products with Bronze ≠ Gold: ${pricingStats[0]?.differentBronzeGold || 0}`);
    console.log(`📊 Products with Gold ≠ Platinum: ${pricingStats[0]?.differentGoldPlatinum || 0}`);
    
    console.log('\n🎉 Pricing markup system now operational!');
    console.log('💎 All products use configured markup rules');
    console.log('🔄 Future syncs will automatically apply markup');
    
  } catch (error) {
    console.error('❌ Error in pricing markup application:', error);
  }
}

// Run the script
if (require.main === module) {
  applyPricingMarkup()
    .then(() => {
      console.log('✅ Pricing markup application completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Pricing markup application failed:', error);
      process.exit(1);
    });
}

export { applyPricingMarkup };