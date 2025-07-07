/**
 * Full Handgun Algolia Sync
 * Updates all handgun products in Algolia with proper subcategory classification
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

async function fullHandgunAlgoliaSync() {
  try {
    console.log('🔄 Starting full handgun Algolia sync...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Get ALL handgun products from database
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} total handgun products to sync`);
    
    // Process in smaller batches to avoid timeouts
    const batchSize = 100;
    let totalSynced = 0;
    let completeHandguns = 0;
    let accessories = 0;
    
    for (let i = 0; i < handgunProducts.length; i += batchSize) {
      const batch = handgunProducts.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(handgunProducts.length / batchSize)} (${batch.length} products)...`);
      
      // Transform products for Algolia with proper subcategory field
      const algoliaUpdates = batch.map(product => {
        if (!product.subcategoryName) {
          completeHandguns++;
        } else {
          accessories++;
        }
        
        return {
          objectID: product.sku,
          subcategoryName: product.subcategoryName || undefined, // Use undefined instead of null for Algolia
          departmentDesc: product.departmentDesc || undefined,
          subDepartmentDesc: product.subDepartmentDesc || undefined,
          // Include core fields
          title: product.name,
          name: product.name,
          description: product.description,
          sku: product.sku,
          manufacturerName: product.manufacturer,
          categoryName: product.category,
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
        };
      });
      
      // Update Algolia
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
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Full handgun sync completed:`);
    console.log(`   - Total products synced: ${totalSynced}`);
    console.log(`   - Complete handguns (no subcategory): ${completeHandguns}`);
    console.log(`   - Accessories (with subcategory): ${accessories}`);
    
    // Test the filtering after sync
    console.log('\n🧪 Testing updated Algolia filtering...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Test complete handguns filter
    const completeTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND NOT _exists_:subcategoryName',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Complete handguns filter: ${completeTest.data.nbHits} total results`);
    console.log('Sample complete handguns:');
    completeTest.data.hits.forEach((hit: any, index: number) => {
      const hasBarrelInName = hit.title?.toLowerCase().includes('bbl') || hit.title?.toLowerCase().includes('barrel');
      console.log(`   ${index + 1}. ${hit.title} ${hasBarrelInName ? '⚠️ (has barrel in name)' : '✅'}`);
    });
    
    // Test accessories filter
    const accessoryTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND _exists_:subcategoryName',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔧 Accessories filter: ${accessoryTest.data.nbHits} total results`);
    console.log('Sample accessories:');
    accessoryTest.data.hits.forEach((hit: any, index: number) => 
      console.log(`   ${index + 1}. ${hit.title} (subcategory: ${hit.subcategoryName})`)
    );
    
    console.log('\n🎉 Full handgun Algolia sync completed!');
    
  } catch (error) {
    console.error('❌ Error in full handgun Algolia sync:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
fullHandgunAlgoliaSync().then(() => {
  console.log('Full sync completed');
  process.exit(0);
}).catch(error => {
  console.error('Full sync failed:', error);
  process.exit(1);
});