/**
 * Complete Algolia Indexing - Final Push to 100%
 * Ensures all 29,834 RSR products are indexed in Algolia with comprehensive filter data
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

interface AlgoliaProduct {
  objectID: string;
  name: string;
  manufacturerName: string;
  categoryName: string;
  departmentNumber: string;
  stockNumber: string;
  rsrStockNumber: string;
  description: string;
  inventoryQuantity: number;
  inStock: boolean;
  dropShippable: boolean;
  upc: string;
  weight: number;
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  caliber: string | null;
  capacity: number | null;
  barrelLength: string | null;
  finish: string | null;
  frameSize: string | null;
  actionType: string | null;
  sightType: string | null;
  tags: string[];
  newItem: boolean;
  internalSpecial: boolean;
  retailPrice: number;
  retailMap: number | null;
  msrp: number;
  dealerPrice: number;
  price: number;
  fflRequired: boolean;
  mpn: string;
}

async function syncBatchToAlgolia(batch: AlgoliaProduct[]) {
  try {
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: batch.map(product => ({
          action: 'updateObject',
          body: product
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Algolia batch sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Synced batch of ${batch.length} products to Algolia`);
    return result;
  } catch (error) {
    console.error('❌ Error syncing batch to Algolia:', error);
    throw error;
  }
}

async function getAllProductsFromDatabase() {
  console.log('📊 Fetching all products from database...');
  
  const products = await db.select().from(schema.products);
  console.log(`📊 Found ${products.length} total products in database`);
  
  return products;
}

async function transformProductsForAlgolia(dbProducts: any[]) {
  console.log('🔄 Transforming products for Algolia...');
  
  const algoliaProducts: AlgoliaProduct[] = dbProducts.map((product, index) => {
    // Debug: Log a few products to see RSR stock number mapping
    if (index < 5 || product.sku === '110G' || product.sku?.startsWith('YHM-9670')) {
      console.log(`🔍 Debug product ${product.sku}: RSR = "${product.rsrStockNumber}"`);
    }

    return {
      objectID: product.sku || `product_${product.id}`,
      name: product.name || 'Unknown Product',
      manufacturerName: product.manufacturerName || 'Unknown',
      categoryName: product.category || 'Uncategorized',
      departmentNumber: product.departmentNumber?.toString() || '00',
      stockNumber: product.sku || '',
      rsrStockNumber: product.rsrStockNumber || product.sku || '',
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
      caliber: product.caliber || null,
      capacity: product.capacity ? parseInt(product.capacity) : null,
      barrelLength: product.barrelLength || null,
      finish: product.finish || null,
      frameSize: product.frameSize || null,
      actionType: product.actionType || null,
      sightType: product.sightType || null,
      tags: product.tags || [],
      newItem: product.newItem || false,
      internalSpecial: product.internalSpecial || false,
      retailPrice: parseFloat(product.priceBronze) || 0,
      retailMap: product.priceMAP ? parseFloat(product.priceMAP) : null,
      msrp: product.priceMSRP ? parseFloat(product.priceMSRP) : 0,
      dealerPrice: parseFloat(product.pricePlatinum) || 0,
      price: parseFloat(product.priceBronze) || 0,
      fflRequired: product.fflRequired || false,
      mpn: product.mpn || '',
    };
  });
  
  console.log(`🔄 Transformed ${algoliaProducts.length} products for Algolia`);
  return algoliaProducts;
}

async function completeAlgoliaIndexing() {
  console.log('🚀 Starting complete Algolia indexing to achieve 100% coverage...');
  
  try {
    // Get all products from database
    const dbProducts = await getAllProductsFromDatabase();
    
    // Transform for Algolia
    const algoliaProducts = await transformProductsForAlgolia(dbProducts);
    
    // Process in batches of 1000
    const batchSize = 1000;
    const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
    
    console.log(`📦 Processing ${algoliaProducts.length} products in ${totalBatches} batches...`);
    
    let processed = 0;
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, algoliaProducts.length);
      const batch = algoliaProducts.slice(start, end);
      
      await syncBatchToAlgolia(batch);
      processed += batch.length;
      
      const percentComplete = ((i + 1) / totalBatches * 100).toFixed(1);
      console.log(`📊 Progress: ${processed}/${algoliaProducts.length} (${percentComplete}%)`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Complete Algolia indexing finished!');
    console.log(`📊 Final Status: ${algoliaProducts.length} products indexed in Algolia`);
    console.log('🎯 100% Algolia indexing coverage achieved!');
    
  } catch (error) {
    console.error('❌ Error in complete Algolia indexing:', error);
    throw error;
  }
}

// Run the complete indexing
completeAlgoliaIndexing()
  .then(() => {
    console.log('🎉 Complete Algolia indexing successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Complete Algolia indexing failed:', error);
    process.exit(1);
  });