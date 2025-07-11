/**
 * Sync Caliber and Tags Data to Algolia
 * Forces update of caliber and tags fields in Algolia index
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, isNotNull } from "drizzle-orm";
import axios from "axios";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = "products";

async function syncCaliberTagsToAlgolia() {
  try {
    console.log('🔄 Starting caliber and tags sync to Algolia...');
    
    // Get all products with caliber data
    const productsWithCaliber = await db
      .select({
        sku: products.sku,
        name: products.name,
        caliber: products.caliber,
        tags: products.tags
      })
      .from(products)
      .where(isNotNull(products.caliber));
    
    console.log(`📊 Found ${productsWithCaliber.length} products with caliber data`);
    
    if (productsWithCaliber.length === 0) {
      console.log('❌ No products with caliber data found');
      return;
    }
    
    // Transform for Algolia updates
    const algoliaUpdates = productsWithCaliber.map(product => ({
      objectID: product.sku,
      caliber: product.caliber,
      tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : []
    }));
    
    console.log(`📝 Preparing ${algoliaUpdates.length} caliber/tags updates for Algolia`);
    
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
          console.log(`✅ Synced ${syncedCount} / ${algoliaUpdates.length} products`);
        } else {
          console.error(`❌ Algolia batch failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error syncing batch ${i / batchSize + 1}:`, error);
      }
    }
    
    console.log(`🎉 Caliber and tags sync complete! Updated ${syncedCount} products`);
    
    // Test the updated index
    console.log('\n🧪 Testing updated Algolia index...');
    const testResponse = await axios.post(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`,
      {
        query: '',
        filters: 'departmentNumber:"01" AND tags:"9mm" AND manufacturerName:"GLOCK"',
        hitsPerPage: 3
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
    console.log(`🎯 Test search results: ${testResults.nbHits} Glock 9mm handguns found`);
    
    if (testResults.hits.length > 0) {
      console.log('✅ Sample product with updated data:');
      console.log(`   Name: ${testResults.hits[0].name}`);
      console.log(`   Caliber: ${testResults.hits[0].caliber}`);
      console.log(`   Tags: ${JSON.stringify(testResults.hits[0].tags)}`);
    }
    
  } catch (error) {
    console.error('💥 Caliber and tags sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncCaliberTagsToAlgolia();