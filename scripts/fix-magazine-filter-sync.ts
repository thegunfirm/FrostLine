#!/usr/bin/env npx tsx

/**
 * Fix Magazine Filter Sync
 * Ensures all magazine attributes are properly synchronized with inStock status
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// Algolia HTTP client function
async function algoliaRequest(method: string, path: string, body?: any) {
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products${path}`, {
    method,
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Algolia ${method} ${path} failed: ${error}`);
  }

  return response.json();
}

async function fixMagazineFilterSync() {
  console.log('🔧 Starting magazine filter sync fix...');
  
  // Get all magazines with their current data
  const magazines = await db.execute(sql`
    SELECT 
      sku,
      name,
      manufacturer,
      caliber,
      capacity,
      finish,
      frame_size,
      stock_quantity,
      (stock_quantity > 0) as in_stock,
      price_bronze,
      price_gold,
      price_platinum,
      price_wholesale,
      price_map,
      price_msrp,
      upc_code,
      weight,
      description,
      manufacturer_part_number,
      requires_ffl,
      drop_shippable,
      new_item,
      internal_special,
      department_number
    FROM products 
    WHERE department_number = '10'
    ORDER BY sku
  `);

  console.log(`📊 Found ${magazines.rows.length} magazines to sync`);

  // Transform magazines for Algolia
  const algoliaObjects = magazines.rows.map((magazine: any) => ({
    objectID: magazine.sku,
    name: magazine.name,
    description: magazine.description,
    manufacturerName: magazine.manufacturer,
    categoryName: 'Magazines',
    departmentNumber: magazine.department_number,
    stockNumber: magazine.sku,
    inventoryQuantity: magazine.stock_quantity,
    inStock: magazine.in_stock,
    dropShippable: magazine.drop_shippable,
    upc: magazine.upc_code,
    weight: magazine.weight,
    tierPricing: {
      bronze: magazine.price_bronze,
      gold: magazine.price_gold,
      platinum: magazine.price_platinum
    },
    caliber: magazine.caliber,
    capacity: magazine.capacity ? parseInt(magazine.capacity) : null,
    barrelLength: null,
    finish: magazine.finish,
    frameSize: magazine.frame_size,
    actionType: null,
    sightType: null,
    tags: [],
    newItem: magazine.new_item,
    internalSpecial: magazine.internal_special,
    retailPrice: magazine.price_msrp,
    retailMap: magazine.price_map,
    msrp: magazine.price_msrp,
    dealerPrice: magazine.price_wholesale,
    price: magazine.price_platinum,
    fflRequired: magazine.requires_ffl,
    mpn: magazine.manufacturer_part_number
  }));

  // Log sample data for debugging
  const sampleInStock = algoliaObjects.filter(obj => obj.inStock).slice(0, 5);
  console.log(`📋 Sample in-stock magazines:`, sampleInStock.map(obj => ({
    name: obj.name,
    caliber: obj.caliber,
    capacity: obj.capacity,
    finish: obj.finish,
    frameSize: obj.frameSize,
    inStock: obj.inStock
  })));

  // Count distribution
  const inStockCount = algoliaObjects.filter(obj => obj.inStock).length;
  const withCaliberCount = algoliaObjects.filter(obj => obj.caliber).length;
  const inStockWithCaliberCount = algoliaObjects.filter(obj => obj.inStock && obj.caliber).length;
  
  console.log(`📊 Data distribution:`);
  console.log(`   Total magazines: ${algoliaObjects.length}`);
  console.log(`   In stock: ${inStockCount}`);
  console.log(`   With caliber: ${withCaliberCount}`);
  console.log(`   In stock with caliber: ${inStockWithCaliberCount}`);

  // Sync to Algolia in batches
  const batchSize = 1000;
  for (let i = 0; i < algoliaObjects.length; i += batchSize) {
    const batch = algoliaObjects.slice(i, i + batchSize);
    
    await algoliaRequest('POST', '/batch', {
      requests: batch.map(obj => ({
        action: 'updateObject',
        body: obj
      }))
    });
    
    console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaObjects.length / batchSize)}`);
  }

  console.log('✅ Magazine filter sync fix complete!');
}

// Run the fix
fixMagazineFilterSync().catch(console.error);