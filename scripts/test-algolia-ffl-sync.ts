/**
 * Test Algolia FFL Sync
 * Quick test to sync a few FFL products and verify the system
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function testAlgoliaFFLSync() {
  try {
    console.log('🧪 Testing Algolia FFL sync...');
    
    // Get a few handgun products that require FFL
    const testProducts = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        eq(products.requiresFFL, true)
      ))
      .limit(5);
    
    console.log(`📊 Found ${testProducts.length} test handgun products`);
    
    if (testProducts.length === 0) {
      console.log('❌ No FFL handgun products found');
      return;
    }
    
    testProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (${product.sku}) - FFL: ${product.requiresFFL}`);
    });
    
    // Sync to Algolia
    const algoliaUpdates = testProducts.map(product => ({
      objectID: product.sku,
      requiresFFL: product.requiresFFL,
      title: product.name,
      name: product.name,
      categoryName: product.category,
      manufacturerName: product.manufacturer,
      tierPricing: {
        bronze: parseFloat(product.priceBronze || '0'),
        gold: parseFloat(product.priceGold || '0'),
        platinum: parseFloat(product.pricePlatinum || '0')
      },
      inStock: product.inStock
    }));
    
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
    
    console.log(`✅ Synced ${response.data.objectIDs?.length || 0} test products`);
    
    // Wait for Algolia to process
    console.log('⏱️  Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test search
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    console.log('🔍 Testing FFL filter...');
    const fflTest = await axios.post(testUrl, {
      query: '',
      filters: 'requiresFFL:true',
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🎯 FFL products in Algolia: ${fflTest.data.nbHits} results`);
    fflTest.data.hits.forEach((hit: any, index: number) => {
      console.log(`  ${index + 1}. ${hit.title} (requiresFFL: ${hit.requiresFFL})`);
    });
    
    console.log('\n🔍 Testing handgun + FFL filter...');
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND requiresFFL:true',
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Handgun + FFL products: ${handgunTest.data.nbHits} results`);
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      console.log(`  ${index + 1}. ${hit.title} (category: ${hit.categoryName}, FFL: ${hit.requiresFFL})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing Algolia FFL sync:', error);
  }
}

testAlgoliaFFLSync().then(() => {
  console.log('Test completed');
}).catch(console.error);