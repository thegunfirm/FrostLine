/**
 * Sync Parts Categories to Algolia
 * Updates all parts products with platform_category and part_type_category data
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = 'products';

interface AlgoliaProduct {
  objectID: string;
  platformCategory?: string;
  partTypeCategory?: string;
}

async function syncBatchToAlgolia(batch: AlgoliaProduct[]) {
  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`;
  
  const requests = batch.map(product => ({
    action: 'partialUpdateObject',
    objectID: product.objectID,
    body: {
      platformCategory: product.platformCategory || null,
      partTypeCategory: product.partTypeCategory || null
    }
  }));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  
  if (!response.ok) {
    throw new Error(`Algolia API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function syncPartsCategoriesAlgolia() {
  console.log('🔄 Starting Parts Categories Algolia sync...');
  
  // Get all parts products with categories
  const partsProducts = await db
    .select({
      sku: products.sku,
      platformCategory: products.platformCategory,
      partTypeCategory: products.partTypeCategory
    })
    .from(products)
    .where(eq(products.departmentNumber, '34'));
  
  console.log(`📦 Found ${partsProducts.length} parts products to sync`);
  
  // Convert to Algolia format
  const algoliaProducts: AlgoliaProduct[] = partsProducts.map(product => ({
    objectID: product.sku!,
    platformCategory: product.platformCategory || undefined,
    partTypeCategory: product.partTypeCategory || undefined
  }));
  
  // Sync in batches of 100
  const batchSize = 100;
  let syncedCount = 0;
  
  for (let i = 0; i < algoliaProducts.length; i += batchSize) {
    const batch = algoliaProducts.slice(i, i + batchSize);
    
    try {
      await syncBatchToAlgolia(batch);
      syncedCount += batch.length;
      console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaProducts.length / batchSize)} (${syncedCount}/${algoliaProducts.length} products)`);
    } catch (error) {
      console.error(`❌ Error syncing batch ${Math.floor(i / batchSize) + 1}:`, error);
    }
  }
  
  console.log(`🎉 Parts Categories Algolia sync completed! Synced ${syncedCount} products`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncPartsCategoriesAlgolia().catch(console.error);
}

export { syncPartsCategoriesAlgolia };