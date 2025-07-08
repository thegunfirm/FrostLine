/**
 * Sync Department Numbers to Algolia
 * Adds departmentNumber field to existing Algolia index for proper filtering
 */

import { db } from "../server/db";
import { products } from "../shared/schema";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function syncDepartmentNumbers() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    console.error('❌ Missing Algolia credentials');
    return;
  }

  console.log('🔄 Starting department number sync to Algolia...');

  try {
    // Get all products with their department info
    const allProducts = await db.select().from(products);
    console.log(`📊 Found ${allProducts.length} products to update`);

    // Process in batches of 1000
    const batchSize = 1000;
    let totalSynced = 0;

    for (let offset = 0; offset < allProducts.length; offset += batchSize) {
      const batch = allProducts.slice(offset, offset + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} (${batch.length} products)`);

      // Map to Algolia format with department numbers
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        departmentNumber: product.departmentNumber || undefined,
        departmentDesc: product.departmentDesc || undefined,
        subDepartmentDesc: product.subDepartmentDesc || undefined,
        // Keep existing essential fields
        title: product.name,
        categoryName: product.category,
        manufacturerName: product.manufacturer,
        requiresFFL: product.requiresFFL
      }));

      // Update Algolia
      const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
      
      const payload = {
        requests: algoliaUpdates.map(product => ({
          action: 'partialUpdateObject',
          body: product
        }))
      };

      const response = await fetch(algoliaUrl, {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`❌ Batch ${Math.floor(offset / batchSize) + 1} failed:`, await response.text());
        continue;
      }

      totalSynced += batch.length;
      console.log(`✅ Batch ${Math.floor(offset / batchSize) + 1} synced successfully`);
    }

    console.log(`🎉 Department number sync complete! Updated ${totalSynced} products in Algolia`);
    
    // Verify the update
    console.log('\n🧪 Testing department number filtering...');
    const testResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 5
      })
    });

    const testResult = await testResponse.json();
    console.log(`✅ Test search found ${testResult.nbHits} products in department 01`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncDepartmentNumbers().catch(console.error);