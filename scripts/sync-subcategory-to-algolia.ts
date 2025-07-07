/**
 * Sync Subcategory Data to Algolia
 * Updates Algolia index with subcategoryName field for proper handgun filtering
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

async function syncSubcategoryToAlgolia() {
  try {
    console.log('🔄 Starting Algolia subcategory sync...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Get all handgun products with subcategory data
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'))
      .limit(200); // Process in batches
    
    console.log(`📊 Found ${handgunProducts.length} handgun products to sync`);
    
    // Transform products for Algolia with subcategoryName field
    const algoliaUpdates = handgunProducts.map(product => ({
      objectID: product.sku,
      subcategoryName: product.subcategoryName || null, // Explicit null for complete handguns
      departmentDesc: product.departmentDesc || null,
      subDepartmentDesc: product.subDepartmentDesc || null,
      // Include all other fields for complete update
      title: product.name,
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
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
      inStock: product.inStock,
      distributor: product.distributor,
      tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : []
    }));
    
    // Split into complete handguns vs accessories for reporting
    const completeHandguns = algoliaUpdates.filter(p => p.subcategoryName === null);
    const accessories = algoliaUpdates.filter(p => p.subcategoryName !== null);
    
    console.log(`🔫 Complete handguns to sync: ${completeHandguns.length}`);
    console.log(`🔧 Accessories to sync: ${accessories.length}`);
    
    // Sync to Algolia
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
    
    const payload = {
      requests: algoliaUpdates.map(product => ({
        action: 'updateObject',
        body: product
      }))
    };
    
    console.log('🔄 Syncing to Algolia...');
    
    const response = await axios.post(algoliaUrl, payload, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Successfully synced ${response.data.objectIDs?.length || 0} products to Algolia`);
    
    // Test the filtering
    console.log('\n🧪 Testing Algolia subcategory filtering...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Test 1: Complete handguns (NOT _exists_:subcategoryName)
    const completeHandgunTest = await axios.post(testUrl, {
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
    
    console.log(`🔫 Complete handguns filter test: ${completeHandgunTest.data.nbHits} results`);
    completeHandgunTest.data.hits.forEach((hit: any) => 
      console.log(`   - ${hit.title} (subcategory: ${hit.subcategoryName || 'null'})`)
    );
    
    // Test 2: Handgun accessories (_exists_:subcategoryName)
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
    
    console.log(`🔧 Accessories filter test: ${accessoryTest.data.nbHits} results`);
    accessoryTest.data.hits.forEach((hit: any) => 
      console.log(`   - ${hit.title} (subcategory: ${hit.subcategoryName})`)
    );
    
    console.log('\n🎉 Algolia subcategory sync completed!');
    console.log('💡 The filtering should now work properly with subcategoryName field');
    
  } catch (error) {
    console.error('❌ Error syncing subcategory to Algolia:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
syncSubcategoryToAlgolia().then(() => {
  console.log('Sync completed');
  process.exit(0);
}).catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
});