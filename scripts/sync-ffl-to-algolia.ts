/**
 * Sync FFL Field to Algolia
 * Updates all products in Algolia with the requiresFFL field from database
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

async function syncFflToAlgolia() {
  try {
    console.log('🔄 Starting FFL field sync to Algolia...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Get all handgun products (where the FFL field matters most)
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} handgun products to sync`);
    
    // Process in batches
    const batchSize = 100;
    let totalSynced = 0;
    
    for (let i = 0; i < handgunProducts.length; i += batchSize) {
      const batch = handgunProducts.slice(i, i + batchSize);
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(handgunProducts.length / batchSize)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        requiresFFL: product.requiresFFL, // Add the FFL field
        // Include other core fields for completeness
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        categoryName: product.category,
        subcategoryName: product.subcategoryName || undefined,
        tierPricing: {
          bronze: parseFloat(product.priceBronze || '0'),
          gold: parseFloat(product.priceGold || '0'),
          platinum: parseFloat(product.pricePlatinum || '0')
        },
        inventory: {
          onHand: product.stockQuantity || 0,
          allocated: product.allocated === 'Y'
        },
        inStock: product.inStock,
        distributor: product.distributor,
        tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : []
      }));
      
      const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
      
      const payload = {
        requests: algoliaUpdates.map(product => ({
          action: 'updateObject',
          body: product
        }))
      };
      
      const response = await axios.post(algoliaUrl, payload, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      totalSynced += response.data.objectIDs?.length || 0;
      console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${response.data.objectIDs?.length || 0} products`);
    }
    
    console.log(`✅ FFL sync completed: ${totalSynced} products updated with requiresFFL field`);
    
    // Test the FFL filter
    console.log('\n🧪 Testing FFL-based handgun filtering...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND NOT _exists_:subcategoryName AND NOT tags:"Accessories" AND requiresFFL:true',
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Complete handguns with FFL filter: ${handgunTest.data.nbHits} results`);
    console.log('Sample results:');
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      console.log(`   ${index + 1}. ${hit.title} (FFL: ${hit.requiresFFL})`);
    });
    
    console.log('\n🎉 FFL field sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing FFL field to Algolia:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
syncFflToAlgolia().then(() => {
  console.log('FFL sync completed');
  process.exit(0);
}).catch(error => {
  console.error('FFL sync failed:', error);
  process.exit(1);
});