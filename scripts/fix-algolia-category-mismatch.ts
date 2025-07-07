/**
 * Fix Algolia Category Mismatch
 * Updates Algolia index to match the correct categories from the database
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

async function fixAlgoliaCategoryMismatch() {
  try {
    console.log('🔄 Starting Algolia category mismatch fix...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // First, check the specific problem product
    const kimberProduct = await db.select()
      .from(products)
      .where(eq(products.name, 'KIMBER EXTND BASE PAD 3 PK BLACK'));
    
    if (kimberProduct.length > 0) {
      console.log(`📋 KIMBER product details:`);
      console.log(`   - Database category: ${kimberProduct[0].category}`);
      console.log(`   - SKU: ${kimberProduct[0].sku}`);
      
      // Check what's in Algolia for this product
      const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
      const algoliaCheck = await axios.post(testUrl, {
        query: 'KIMBER EXTND BASE PAD',
        hitsPerPage: 1
      }, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (algoliaCheck.data.hits.length > 0) {
        const algoliaProduct = algoliaCheck.data.hits[0];
        console.log(`   - Algolia category: ${algoliaProduct.categoryName}`);
        console.log(`   - Algolia subcategory: ${algoliaProduct.subcategoryName}`);
      }
    }
    
    // Get all products that might have category mismatches
    const allProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Accessories'));
    
    console.log(`📊 Found ${allProducts.length} products in Accessories category`);
    
    // Process in batches to update Algolia with correct categories
    const batchSize = 100;
    let totalUpdated = 0;
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)} (${batch.length} products)...`);
      
      // Transform products for Algolia with correct category
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        categoryName: product.category, // Use the correct category from database
        subcategoryName: product.subcategoryName || undefined,
        // Include core fields
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
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
      
      totalUpdated += response.data.objectIDs?.length || 0;
      console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}: ${response.data.objectIDs?.length || 0} products`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Category mismatch fix completed: ${totalUpdated} products updated`);
    
    // Test the fix
    console.log('\n🧪 Testing category filtering after fix...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Test handgun filter - should NOT include KIMBER base pad
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND NOT _exists_:subcategoryName',
      hitsPerPage: 3
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Handgun filter test: ${handgunTest.data.nbHits} results`);
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      const isKimber = hit.title?.includes('KIMBER');
      console.log(`   ${index + 1}. ${hit.title} ${isKimber ? '⚠️ (KIMBER still here)' : '✅'}`);
    });
    
    // Test accessories filter - should include KIMBER base pad
    const accessoryTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Accessories"',
      hitsPerPage: 3
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔧 Accessories filter test: ${accessoryTest.data.nbHits} results`);
    accessoryTest.data.hits.forEach((hit: any, index: number) => {
      const isKimber = hit.title?.includes('KIMBER');
      console.log(`   ${index + 1}. ${hit.title} ${isKimber ? '✅ (KIMBER found here)' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing Algolia category mismatch:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
fixAlgoliaCategoryMismatch().then(() => {
  console.log('Category mismatch fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Category mismatch fix failed:', error);
  process.exit(1);
});