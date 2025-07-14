#!/usr/bin/env tsx
/**
 * Sync Moved Products to Algolia
 * Update Algolia index with products moved from rifles to Uppers/Lowers
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function syncMovedProductsToAlgolia() {
  console.log('🔄 Syncing moved products to Algolia...');
  
  try {
    // Get all products in Uppers/Lowers category
    const uppersLowersProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, manufacturer, category, receiver_type,
        price_bronze, price_gold, price_platinum, stock_quantity, 
        description, weight, upc_code, drop_shippable, new_item, 
        in_stock, requires_ffl, caliber, capacity, barrel_length, 
        finish, frame_size, action_type, sight_type
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${uppersLowersProducts.rows.length} Uppers/Lowers products to sync`);
    
    // Transform for Algolia
    const algoliaProducts = uppersLowersProducts.rows.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description || '',
      manufacturerName: product.manufacturer || '',
      categoryName: product.category || 'Uppers/Lowers',
      departmentNumber: product.department_number,
      stockNumber: product.sku,
      inventoryQuantity: product.stock_quantity || 0,
      inStock: product.in_stock || false,
      dropShippable: product.drop_shippable || false,
      upc: product.upc_code || '',
      weight: parseFloat(product.weight || '0'),
      tierPricing: {
        bronze: parseFloat(product.price_bronze || '0'),
        gold: parseFloat(product.price_gold || '0'),
        platinum: parseFloat(product.price_platinum || '0')
      },
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrel_length,
      finish: product.finish,
      frameSize: product.frame_size,
      actionType: product.action_type,
      sightType: product.sight_type,
      receiverType: product.receiver_type, // Important for Uppers/Lowers filtering
      newItem: product.new_item || false,
      requiresFfl: product.requires_ffl || false,
      price: parseFloat(product.price_platinum || '0')
    }));
    
    console.log(`🔄 Syncing ${algoliaProducts.length} products to Algolia...`);
    
    // Sync in batches of 100
    const batchSize = 100;
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
      
      const requests = batch.map(product => ({
        action: 'updateObject',
        body: product
      }));
      
      await sendBatchToAlgolia(requests);
      console.log(`✅ Synced batch ${batchNumber} of ${totalBatches}`);
    }
    
    // Wait for indexing
    console.log('⏳ Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify sync
    await verifyUppersLowersSync();
    
    console.log('✅ Sync complete');
    
  } catch (error) {
    console.error('❌ Error in sync:', error);
  }
}

async function sendBatchToAlgolia(requests: any[]) {
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Algolia batch update failed: ${error}`);
  }
}

async function verifyUppersLowersSync() {
  console.log('🔍 Verifying Uppers/Lowers sync...');
  
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'categoryName:"Uppers/Lowers"',
      hitsPerPage: 1
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`📊 Algolia Uppers/Lowers count: ${data.nbHits}`);
  }
  
  // Also check rifles to ensure they're clean
  const riflesResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
      hitsPerPage: 1
    })
  });
  
  if (riflesResponse.ok) {
    const riflesData = await riflesResponse.json();
    console.log(`📊 Algolia Rifles count: ${riflesData.nbHits}`);
  }
}

syncMovedProductsToAlgolia();