/**
 * Sync All FFL Requirements to Algolia
 * Updates the requiresFFL field for all products in Algolia to ensure proper filtering
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function syncAllFFLToAlgolia() {
  try {
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    console.log('🔄 Starting complete FFL field sync to Algolia...');
    
    // Get ALL products with FFL requirements
    const allProducts = await db.select()
      .from(products);
    
    console.log(`📊 Found ${allProducts.length} total products to sync`);
    
    // Process in batches
    const batchSize = 100;
    let totalSynced = 0;
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        requiresFFL: product.requiresFFL, // Add the FFL field
        // Include core fields for completeness
        title: product.name,
        categoryName: product.category,
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
    
    console.log(`✅ Complete FFL sync finished: ${totalSynced} products updated with requiresFFL field`);
    
    // Test the complete FFL sync
    console.log('\n🧪 Testing complete FFL sync results...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Test 1: Count products requiring FFL
    const fflTest = await axios.post(testUrl, {
      query: '',
      filters: 'requiresFFL:true',
      hitsPerPage: 0
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Total products requiring FFL: ${fflTest.data.nbHits} results`);
    
    // Test 2: Check handguns with FFL requirement
    const handgunFFLTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND requiresFFL:true',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Complete handguns with FFL filter: ${handgunFFLTest.data.nbHits} results`);
    console.log('Sample handgun results:');
    handgunFFLTest.data.hits.forEach((hit: any, index: number) => {
      console.log(`  ${index + 1}. ${hit.title} (requiresFFL: ${hit.requiresFFL})`);
    });
    
    console.log('\n🎉 Complete FFL field sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing FFL fields to Algolia:', error);
  }
}

syncAllFFLToAlgolia().then(() => {
  console.log('Complete FFL sync completed');
}).catch(console.error);