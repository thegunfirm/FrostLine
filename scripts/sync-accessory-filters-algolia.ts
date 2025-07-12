/**
 * Sync Accessory Filters to Algolia
 * Updates accessory products with comprehensive filtering data (accessoryType, compatibility, material, mountType)
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Define accessory department numbers
const accessoryDepartments = ['09', '11', '12', '13', '14', '17', '20', '21', '25', '26', '27', '30', '31', '35'];

interface AlgoliaProduct {
  objectID: string;
  accessoryType?: string;
  compatibility?: string;
  material?: string;
  mountType?: string;
  [key: string]: any;
}

async function syncAccessoryFiltersToAlgolia() {
  console.log('🔧 Starting Accessory Filter Sync to Algolia...');
  
  try {
    // Get all accessory products with filter data
    const accessoryProductsWithFilters = await db.select()
      .from(products)
      .where(eq(products.category, 'Accessories'));

    console.log(`📊 Found ${accessoryProductsWithFilters.length} accessory products to sync`);

    // Count products with each filter type
    const withAccessoryType = accessoryProductsWithFilters.filter(p => p.accessoryType).length;
    const withCompatibility = accessoryProductsWithFilters.filter(p => p.compatibility).length;
    const withMaterial = accessoryProductsWithFilters.filter(p => p.materialFinish).length;
    const withMountType = accessoryProductsWithFilters.filter(p => p.mountType).length;

    console.log(`📈 Coverage: ${withAccessoryType} accessory types, ${withCompatibility} compatibility, ${withMaterial} materials, ${withMountType} mount types`);

    // Transform for Algolia - include all accessory products
    const algoliaUpdates: AlgoliaProduct[] = accessoryProductsWithFilters.map(product => ({
      objectID: product.sku,
      accessoryType: product.accessoryType || undefined,
      compatibility: product.compatibility || undefined,
      material: product.materialFinish || undefined,
      mountType: product.mountType || undefined,
    }));

    console.log(`🎯 Syncing ${algoliaUpdates.length} products to Algolia`);

    // Batch sync to Algolia
    const batchSize = 100;
    let synced = 0;

    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
      const requests = batch.map(update => ({
        action: 'partialUpdateObject',
        body: update
      }));

      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/rsr_products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: requests
        })
      });

      if (!response.ok) {
        throw new Error(`Algolia batch update failed: ${response.status}`);
      }

      synced += batch.length;
      console.log(`📤 Synced ${synced}/${algoliaUpdates.length} products (${Math.round(synced / algoliaUpdates.length * 100)}%)`);
    }

    console.log('✅ Accessory filter sync completed successfully');
    console.log(`📊 Updated ${synced} products with accessory filter data`);

  } catch (error) {
    console.error('❌ Error syncing accessory filters:', error);
    process.exit(1);
  }
}

// Run the script
syncAccessoryFiltersToAlgolia().then(() => {
  console.log('🎯 Accessory filter sync complete');
  process.exit(0);
});