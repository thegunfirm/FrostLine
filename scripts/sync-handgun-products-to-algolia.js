/**
 * Sync Handgun Products to Algolia
 * Updates Algolia index with handgun products that have proper "Handguns" tags
 */

import { Pool } from '@neondatabase/serverless';
import axios from 'axios';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function syncHandgunProductsToAlgolia() {
  try {
    console.log('🔄 Starting handgun products sync to Algolia...');
    
    // Get all handgun products from database
    const result = await pool.query(`
      SELECT id, name, description, category, manufacturer, sku, 
             price_bronze, price_gold, price_platinum, in_stock, 
             stock_quantity, tags, images, price_map, price_msrp
      FROM products 
      WHERE category = 'Handguns' 
      AND tags::text LIKE '%"Handguns"%'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${result.rows.length} handgun products to sync`);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No handgun products found with "Handguns" tag');
      return;
    }
    
    // Transform products for Algolia
    const algoliaProducts = result.rows.map(product => ({
      objectID: product.id.toString(),
      name: product.name,
      description: product.description || '',
      categoryName: product.category,
      manufacturerName: product.manufacturer || '',
      sku: product.sku || '',
      priceBronze: parseFloat(product.price_bronze || '0'),
      priceGold: parseFloat(product.price_gold || '0'),
      pricePlatinum: parseFloat(product.price_platinum || '0'),
      inStock: product.in_stock || false,
      stockQuantity: product.stock_quantity || 0,
      tags: product.tags || [],
      images: product.images || [],
      priceMAP: parseFloat(product.price_map || '0'),
      priceMSRP: parseFloat(product.price_msrp || '0')
    }));
    
    console.log('🔍 Sample handgun product for Algolia:');
    console.log('- Name:', algoliaProducts[0].name);
    console.log('- Category:', algoliaProducts[0].categoryName);
    console.log('- Tags:', algoliaProducts[0].tags);
    console.log('- SKU:', algoliaProducts[0].sku);
    
    // Sync to Algolia using HTTP API
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
    
    // Process in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      const payload = {
        requests: batch.map(product => ({
          action: 'updateObject',
          body: product
        }))
      };
      
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1} (${batch.length} products)...`);
      
      const response = await axios.post(algoliaUrl, payload, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.objectIDs) {
        console.log(`✅ Successfully synced ${response.data.objectIDs.length} handgun products`);
      }
    }
    
    console.log('🎉 Handgun products sync to Algolia completed!');
    
    // Test the filter
    console.log('🧪 Testing handgun filter...');
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
    
    console.log(`🔍 Test filter results: ${testResponse.data.nbHits} handgun products found`);
    if (testResponse.data.hits.length > 0) {
      console.log('✅ Sample result:', testResponse.data.hits[0].name);
    }
    
  } catch (error) {
    console.error('❌ Error syncing handgun products:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await pool.end();
  }
}

syncHandgunProductsToAlgolia();