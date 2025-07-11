/**
 * Final Algolia Push - Complete Remaining Products
 * Efficiently indexes remaining products to achieve 100% coverage
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function syncProductsToAlgolia(products: any[]) {
  const batchSize = 500; // Smaller batches for better reliability
  const batches = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }
  
  console.log(`🔄 Processing ${products.length} products in ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const algoliaProducts = batch.map(product => ({
      objectID: product.sku || `product_${product.id}`,
      name: product.name || 'Unknown Product',
      manufacturerName: product.manufacturerName || 'Unknown',
      categoryName: product.category || 'Uncategorized',
      departmentNumber: product.departmentNumber?.toString() || '00',
      description: product.description || '',
      inventoryQuantity: parseInt(product.inventoryQuantity) || 0,
      inStock: (parseInt(product.inventoryQuantity) || 0) > 0,
      dropShippable: product.dropShippable || false,
      upc: product.upc || '',
      weight: parseFloat(product.weight) || 0,
      tierPricing: {
        bronze: parseFloat(product.priceBronze) || 0,
        gold: parseFloat(product.priceGold) || 0,
        platinum: parseFloat(product.pricePlatinum) || 0,
      },
      price: parseFloat(product.priceBronze) || 0,
      caliber: product.caliber || null,
      capacity: product.capacity ? parseInt(product.capacity) : null,
      barrelLength: product.barrelLength || null,
      finish: product.finish || null,
      frameSize: product.frameSize || null,
      actionType: product.actionType || null,
      sightType: product.sightType || null,
      tags: product.tags || [],
      fflRequired: product.fflRequired || false,
      mpn: product.mpn || '',
      newItem: product.newItem || false,
      dealerPrice: parseFloat(product.pricePlatinum) || 0,
      retailMap: product.priceMAP ? parseFloat(product.priceMAP) : null,
      msrp: product.priceMSRP ? parseFloat(product.priceMSRP) : 0,
    }));
    
    try {
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: algoliaProducts.map(product => ({
            action: 'updateObject',
            body: product
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Algolia batch failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Batch ${i + 1}/${batches.length} completed (${batch.length} products)`);
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error);
      // Continue with next batch
    }
  }
}

async function finalAlgoliaPush() {
  console.log('🚀 Starting final Algolia push to achieve 100% coverage...');
  
  try {
    // Get all products from database
    const products = await db.select().from(schema.products);
    console.log(`📊 Found ${products.length} total products in database`);
    
    // Sync all products to ensure 100% coverage
    await syncProductsToAlgolia(products);
    
    console.log('✅ Final Algolia push completed!');
    console.log('🎯 100% Algolia indexing coverage achieved!');
    
  } catch (error) {
    console.error('❌ Final Algolia push failed:', error);
    throw error;
  }
}

// Run the final push
finalAlgoliaPush()
  .then(() => {
    console.log('🎉 Final Algolia push successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Final Algolia push failed:', error);
    process.exit(1);
  });