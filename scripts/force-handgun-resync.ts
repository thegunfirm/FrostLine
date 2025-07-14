#!/usr/bin/env tsx
/**
 * Force Handgun Resync
 * Completely re-sync all handgun products from database to Algolia
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function forceHandgunResync() {
  console.log('🔄 Force resyncing handgun products...');
  
  try {
    // Get all handgun products from database
    const handgunProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, manufacturer, category, 
        price_bronze, price_gold, price_platinum, stock_quantity, 
        description, weight, upc_code, drop_shippable, new_item, 
        in_stock, requires_ffl, caliber, capacity, barrel_length, 
        finish, frame_size, action_type, sight_type
      FROM products 
      WHERE department_number = '01' AND category != 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${handgunProducts.rows.length} handgun products in database`);
    
    // Transform for Algolia
    const algoliaProducts = handgunProducts.rows.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description || '',
      manufacturerName: product.manufacturer || '',
      categoryName: product.category || 'Handguns',
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
    
    console.log('✅ Handgun resync complete');
    
    // Wait for indexing and verify
    console.log('⏳ Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await verifyHandgunCount();
    
  } catch (error) {
    console.error('❌ Error in handgun resync:', error);
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

async function verifyHandgunCount() {
  console.log('🔍 Verifying handgun count...');
  
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"01" AND NOT categoryName:"Uppers/Lowers"',
      hitsPerPage: 1
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`📊 Algolia handgun count after resync: ${data.nbHits}`);
  }
}

forceHandgunResync();