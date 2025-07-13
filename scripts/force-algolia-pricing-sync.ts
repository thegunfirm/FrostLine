/**
 * Force Algolia Pricing Sync
 * Permanently fixes the Gold pricing issue by syncing database pricing to Algolia
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function forceAlgoliaPricingSync() {
  console.log('🔄 Starting force Algolia pricing sync...');
  
  try {
    // Get all RSR products from database
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    console.log(`📊 Found ${allProducts.length} RSR products in database`);

    // Prepare batch updates for Algolia
    const algoliaUpdates = allProducts.map(product => ({
      objectID: product.sku,
      tierPricing: {
        bronze: parseFloat(product.priceBronze?.toString() || '0'),
        gold: parseFloat(product.priceGold?.toString() || '0'),
        platinum: parseFloat(product.pricePlatinum?.toString() || '0')
      }
    }));

    console.log('📋 Sample pricing updates:');
    algoliaUpdates.slice(0, 5).forEach(update => {
      console.log(`${update.objectID}: Bronze=$${update.tierPricing.bronze}, Gold=$${update.tierPricing.gold}, Platinum=$${update.tierPricing.platinum}`);
    });

    // Use HTTP requests to update Algolia via the existing API
    const batchSize = 1000;
    const totalBatches = Math.ceil(algoliaUpdates.length / batchSize);
    let totalUpdated = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, algoliaUpdates.length);
      const batch = algoliaUpdates.slice(start, end);

      console.log(`📦 Updating batch ${i + 1}/${totalBatches} (${batch.length} products)`);

      try {
        // Use the existing sync endpoint to update Algolia
        const response = await fetch('http://localhost:5000/api/admin/sync-algolia-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ products: batch })
        });

        if (!response.ok) {
          console.error(`❌ Batch ${i + 1} failed: ${response.status}`);
          continue;
        }

        totalUpdated += batch.length;
        console.log(`   ✅ Updated ${totalUpdated}/${algoliaUpdates.length} products`);

      } catch (error) {
        console.error(`❌ Error updating batch ${i + 1}:`, error);
      }

      // Small delay to avoid rate limiting
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Force Algolia pricing sync completed:`);
    console.log(`   📊 Total products updated: ${totalUpdated}`);

    // Verify the update worked
    console.log('\n🔍 Verifying updated Algolia pricing...');
    
    const verifyResponse = await fetch('http://localhost:5000/api/search/algolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: { category: 'Rifles' },
        page: 1,
        hitsPerPage: 5
      })
    });

    if (verifyResponse.ok) {
      const verifyResults = await verifyResponse.json();
      
      console.log('📊 Updated Algolia pricing verification:');
      verifyResults.hits.forEach((hit: any) => {
        const bronze = parseFloat(hit.tierPricing.bronze);
        const gold = parseFloat(hit.tierPricing.gold);
        const savings = bronze - gold;
        const savingsPercent = bronze > 0 ? ((savings / bronze) * 100).toFixed(1) : '0.0';
        
        console.log(`${hit.stockNumber}: Bronze=$${bronze.toFixed(2)}, Gold=$${gold.toFixed(2)} (${savingsPercent}% savings)`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error in force Algolia pricing sync:', error);
  }
}

// Run the force sync
forceAlgoliaPricingSync().catch(console.error);