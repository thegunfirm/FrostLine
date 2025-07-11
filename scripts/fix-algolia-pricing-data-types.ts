/**
 * Fix Algolia Pricing Data Types
 * Converts string pricing values to numbers in Algolia for proper filtering
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { isNotNull } from "drizzle-orm";
import axios from "axios";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = "products";

async function fixAlgoliaPricingDataTypes() {
  try {
    console.log('🔄 Fixing Algolia pricing data types...');
    
    // Get all products with pricing data
    const productsWithPricing = await db
      .select({
        sku: products.sku,
        name: products.name,
        priceBronze: products.priceBronze,
        priceGold: products.priceGold,
        pricePlatinum: products.pricePlatinum
      })
      .from(products)
      .where(isNotNull(products.priceBronze));
    
    console.log(`📊 Found ${productsWithPricing.length} products with pricing data`);
    
    if (productsWithPricing.length === 0) {
      console.log('❌ No products with pricing data found');
      return;
    }
    
    // Transform for Algolia updates with proper number types
    const algoliaUpdates = productsWithPricing.map(product => ({
      objectID: product.sku,
      tierPricing: {
        bronze: parseFloat(product.priceBronze || '0'),
        gold: parseFloat(product.priceGold || '0'), 
        platinum: parseFloat(product.pricePlatinum || '0')
      },
      // Also update individual price fields as numbers
      priceBronze: parseFloat(product.priceBronze || '0'),
      priceGold: parseFloat(product.priceGold || '0'),
      pricePlatinum: parseFloat(product.pricePlatinum || '0')
    }));
    
    console.log(`📝 Preparing ${algoliaUpdates.length} pricing updates for Algolia`);
    
    // Sample the data types
    const sample = algoliaUpdates[0];
    console.log('📋 Sample update data:');
    console.log(`  Bronze: ${sample.tierPricing.bronze} (${typeof sample.tierPricing.bronze})`);
    console.log(`  Gold: ${sample.tierPricing.gold} (${typeof sample.tierPricing.gold})`);
    console.log(`  Platinum: ${sample.tierPricing.platinum} (${typeof sample.tierPricing.platinum})`);
    
    // Send to Algolia in batches
    const batchSize = 100;
    let syncedCount = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaUpdates.length / batchSize)}...`);
      
      try {
        const response = await axios.post(
          `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`,
          {
            requests: batch.map(update => ({
              action: 'partialUpdateObject',
              body: update
            }))
          },
          {
            headers: {
              'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
              'X-Algolia-Application-Id': ALGOLIA_APP_ID,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 200) {
          syncedCount += batch.length;
          console.log(`✅ Fixed ${syncedCount} / ${algoliaUpdates.length} products`);
        } else {
          console.error(`❌ Algolia batch failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error syncing batch ${i / batchSize + 1}:`, error);
      }
    }
    
    console.log(`🎉 Pricing data type fix complete! Updated ${syncedCount} products`);
    
    // Test the updated index
    console.log('\n🧪 Testing updated Algolia index...');
    const testResponse = await axios.post(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`,
      {
        query: '',
        filters: 'departmentNumber:"01" AND manufacturerName:"GLOCK" AND tierPricing.platinum >= 750 AND tierPricing.platinum < 1000',
        hitsPerPage: 1
      },
      {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const testResults = testResponse.data;
    console.log(`🎯 Test price range filter: ${testResults.nbHits} products found`);
    
    if (testResults.hits.length > 0) {
      console.log('✅ Sample product with fixed pricing data:');
      console.log(`   Name: ${testResults.hits[0].name}`);
      console.log(`   Platinum: ${testResults.hits[0].tierPricing.platinum} (${typeof testResults.hits[0].tierPricing.platinum})`);
    }
    
  } catch (error) {
    console.error('💥 Pricing data type fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixAlgoliaPricingDataTypes();