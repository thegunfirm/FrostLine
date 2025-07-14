#!/usr/bin/env tsx
/**
 * Force Sync Rifles Category
 * Force sync all rifles to Algolia to ensure proper categorization
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function forceSyncRiflesCategory() {
  console.log('🔄 Force syncing rifles category to Algolia...');
  
  try {
    // Get all products in rifles category from database
    const riflesProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, manufacturer, category, receiver_type,
        price_bronze, price_gold, price_platinum, stock_quantity, 
        description, weight, upc_code, drop_shippable, new_item, 
        in_stock, requires_ffl, caliber, capacity, barrel_length, 
        finish, frame_size, action_type, sight_type
      FROM products 
      WHERE department_number = '05' AND category = 'Rifles'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${riflesProducts.rows.length} rifles in database`);
    
    // Transform for Algolia
    const algoliaProducts = riflesProducts.rows.map(product => ({
      objectID: product.sku,
      name: product.name,
      title: product.name, // Some systems use title instead of name
      description: product.description || '',
      manufacturerName: product.manufacturer || '',
      categoryName: 'Rifles', // Force correct category
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
      receiverType: product.receiver_type,
      newItem: product.new_item || false,
      requiresFfl: product.requires_ffl || false,
      price: parseFloat(product.price_platinum || '0')
    }));
    
    console.log(`🔄 Syncing ${algoliaProducts.length} rifles to Algolia...`);
    
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
    await verifyRiflesSync();
    
    console.log('✅ Rifles sync complete');
    
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

async function verifyRiflesSync() {
  console.log('🔍 Verifying rifles sync...');
  
  // Check rifles category
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
  
  // Check for uppers/lowers still in rifles
  const uppersLowersInRiflesResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'upper OR lower OR receiver',
      filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
      hitsPerPage: 1
    })
  });
  
  if (uppersLowersInRiflesResponse.ok) {
    const uppersLowersData = await uppersLowersInRiflesResponse.json();
    console.log(`📊 Uppers/Lowers in Rifles (Algolia): ${uppersLowersData.nbHits}`);
    
    if (uppersLowersData.nbHits > 0) {
      console.log('🚨 Still finding uppers/lowers in rifles category in Algolia');
      uppersLowersData.hits.forEach(hit => {
        console.log(`  ${hit.objectID}: ${hit.title || hit.name}`);
      });
    }
  }
}

forceSyncRiflesCategory();