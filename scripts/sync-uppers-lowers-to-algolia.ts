/**
 * Sync Uppers/Lowers Category to Algolia
 * Updates all products with the new "Uppers/Lowers" category in Algolia search index
 */

import { Client, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function syncUppersLowersToAlgolia() {
  console.log('🔄 Starting Uppers/Lowers category sync to Algolia...');
  
  await client.connect();
  
  try {
    // Get all products with the new "Uppers/Lowers" category
    const result = await client.query(`
      SELECT 
        sku,
        name,
        category,
        department_number,
        manufacturer,
        description,
        stock_quantity,
        in_stock,
        drop_shippable,
        upc_code,
        weight,
        price_bronze,
        price_gold,
        price_platinum,
        caliber,
        capacity,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type,
        new_item,
        internal_special,
        price_msrp,
        price_map,
        price_wholesale,
        requires_ffl,
        manufacturer_part_number
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY sku
    `);
    
    console.log(`📊 Found ${result.rows.length} Uppers/Lowers products to sync`);
    
    if (result.rows.length === 0) {
      console.log('❌ No products found to sync');
      return;
    }
    
    // Transform products for Algolia
    const algoliaProducts = result.rows.map((product: any) => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      departmentNumber: product.department_number,
      stockNumber: product.sku,
      inventoryQuantity: product.stock_quantity,
      inStock: product.in_stock,
      dropShippable: product.drop_shippable,
      upc: product.upc_code,
      weight: product.weight,
      tierPricing: {
        bronze: parseFloat(product.price_bronze) || 0,
        gold: parseFloat(product.price_gold) || 0,
        platinum: parseFloat(product.price_platinum) || 0,
      },
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrel_length,
      finish: product.finish,
      frameSize: product.frame_size,
      actionType: product.action_type,
      sightType: product.sight_type,
      newItem: product.new_item,
      internalSpecial: product.internal_special,
      retailPrice: parseFloat(product.price_msrp) || 0,
      retailMap: product.price_map ? parseFloat(product.price_map) : null,
      msrp: parseFloat(product.price_msrp) || 0,
      dealerPrice: parseFloat(product.price_wholesale) || 0,
      price: parseFloat(product.price_platinum) || 0,
      fflRequired: product.requires_ffl,
      mpn: product.manufacturer_part_number,
      tags: ['Uppers/Lowers']
    }));
    
    // Batch sync to Algolia using HTTP API
    const batchSize = 100;
    let synced = 0;
    
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      try {
        const requests = batch.map(product => ({
          action: 'addObject',
          body: product
        }));
        
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        synced += batch.length;
        console.log(`✅ Synced ${synced}/${algoliaProducts.length} products to Algolia`);
      } catch (error) {
        console.error(`❌ Error syncing batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    console.log(`🎉 Successfully synced ${synced} Uppers/Lowers products to Algolia`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  } finally {
    await client.end();
  }
}

// Run the sync
syncUppersLowersToAlgolia().catch(console.error);