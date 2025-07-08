/**
 * Flush and Reload Algolia Index
 * Clears Algolia completely and rebuilds with pristine database data
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { isNotNull } from 'drizzle-orm';

async function flushAndReloadAlgolia() {
  console.log('🔄 Starting Algolia flush and reload...');
  
  try {
    // Step 1: Clear Algolia index
    console.log('🗑️ Clearing Algolia index...');
    const clearResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/clear`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      }
    });
    
    if (!clearResponse.ok) {
      throw new Error(`Failed to clear Algolia index: ${clearResponse.statusText}`);
    }
    
    console.log('✅ Algolia index cleared');
    
    // Step 2: Get all products from database
    console.log('📊 Loading products from database...');
    const allProducts = await db
      .select()
      .from(products)
      .where(isNotNull(products.departmentNumber))
      .orderBy(products.id);
    
    console.log(`📦 Found ${allProducts.length} products with department numbers`);
    
    // Step 3: Reload products in batches
    const batchSize = 1000;
    let processed = 0;
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      // Transform to Algolia format
      const algoliaObjects = batch.map(product => ({
        objectID: product.sku,
        name: product.name,
        description: product.description,
        sku: product.sku,
        category: product.category,
        departmentNumber: product.departmentNumber,
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
        images: product.images || []
      }));
      
      // Add to Algolia index
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: algoliaObjects.map(obj => ({
            action: 'addObject',
            body: obj
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Algolia batch add failed: ${response.statusText}`);
      }
      
      processed += batch.length;
      console.log(`⚡ Loaded ${processed}/${allProducts.length} products into Algolia`);
    }
    
    console.log('✅ Algolia reload completed');
    
    // Step 4: Test department number accuracy
    console.log('\n🧪 Testing department number accuracy...');
    
    // Test Department 01 count
    const dept01Response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 5
      })
    });
    
    const dept01Results = await dept01Response.json();
    console.log(`📊 Department 01 products in Algolia: ${dept01Results.nbHits}`);
    
    // Test specific products
    const testProducts = ['YHM-BL-04P', 'WR7913M'];
    for (const sku of testProducts) {
      const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: sku,
          hitsPerPage: 1
        })
      });
      
      const testResults = await testResponse.json();
      if (testResults.hits.length > 0) {
        const product = testResults.hits[0];
        console.log(`🔍 ${sku}: Department ${product.departmentNumber} (${product.name})`);
      }
    }
    
    console.log('\n🎯 Algolia flush and reload completed successfully!');
    
  } catch (error) {
    console.error('❌ Algolia flush and reload failed:', error);
  }
}

// Run the flush and reload
flushAndReloadAlgolia();