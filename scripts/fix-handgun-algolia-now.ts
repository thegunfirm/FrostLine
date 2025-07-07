/**
 * Fix Handgun Algolia Issue - Immediate Fix
 * Syncs handgun products to Algolia with proper tag structure
 */

import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';

async function fixHandgunAlgoliaIssue() {
  try {
    console.log('🔄 Starting immediate fix for handgun Algolia issue...');
    
    // Get handgun products from database
    const handgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'))
      .limit(100);
    
    console.log(`📊 Found ${handgunProducts.length} handgun products`);
    
    if (handgunProducts.length === 0) {
      console.log('❌ No handgun products found in database');
      return;
    }
    
    // Show sample product structure
    console.log('🔍 Sample handgun product:');
    console.log('- Name:', handgunProducts[0].name);
    console.log('- Category:', handgunProducts[0].category);
    console.log('- Tags:', handgunProducts[0].tags);
    
    // Transform for Algolia
    const algoliaProducts = handgunProducts.map(product => ({
      objectID: product.id.toString(),
      name: product.name,
      description: product.description || '',
      categoryName: product.category,
      manufacturerName: product.manufacturer || '',
      sku: product.sku || '',
      priceBronze: parseFloat(product.priceBronze || '0'),
      priceGold: parseFloat(product.priceGold || '0'),
      pricePlatinum: parseFloat(product.pricePlatinum || '0'),
      inStock: product.inStock || false,
      stockQuantity: product.stockQuantity || 0,
      tags: product.tags || [],
      images: product.images || []
    }));
    
    // Use environment variables directly
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Sync to Algolia
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
    
    const payload = {
      requests: algoliaProducts.map(product => ({
        action: 'updateObject',
        body: product
      }))
    };
    
    console.log('🔄 Syncing handgun products to Algolia...');
    
    const response = await axios.post(algoliaUrl, payload, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Successfully synced ${response.data.objectIDs?.length || 0} handgun products`);
    
    // Test the exact filter being used
    console.log('🧪 Testing the exact filter from the backend...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    const testResponse = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND tags:"Handguns" AND NOT tags:"Accessories"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔍 Filter test results: ${testResponse.data.nbHits} handgun products found`);
    if (testResponse.data.hits.length > 0) {
      console.log('✅ Sample result:', testResponse.data.hits[0].name);
      console.log('✅ Categories:', testResponse.data.hits[0].categoryName);
      console.log('✅ Tags:', testResponse.data.hits[0].tags);
    } else {
      console.log('❌ Still no results - checking individual filters...');
      
      // Test just category filter
      const categoryTest = await axios.post(testUrl, {
        query: '',
        filters: 'categoryName:"Handguns"',
        hitsPerPage: 5
      }, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Category only test: ${categoryTest.data.nbHits} products found`);
      if (categoryTest.data.hits.length > 0) {
        const sample = categoryTest.data.hits[0];
        console.log('- Sample name:', sample.name);
        console.log('- Sample category:', sample.categoryName);
        console.log('- Sample tags:', sample.tags);
      }
    }
    
    console.log('🎉 Handgun Algolia fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing handgun Algolia issue:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

fixHandgunAlgoliaIssue();