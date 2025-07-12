/**
 * Continuous Accessory Sync
 * Syncs accessories that have been processed to Algolia in batches
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import axios from 'axios';

// Algolia configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'QWHWU806V0';
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

if (!ALGOLIA_ADMIN_API_KEY) {
  throw new Error('Missing required environment variable: ALGOLIA_ADMIN_API_KEY');
}

const ALGOLIA_BASE_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products`;

interface AlgoliaProduct {
  objectID: string;
  accessoryType?: string;
  compatibility?: string;
  material?: string;
  mountType?: string;
  [key: string]: any;
}

async function continuousAccessorySync() {
  console.log('🔄 Starting Continuous Accessory Sync...');
  
  try {
    // Get accessories that have been processed with filter data
    const processedAccessories = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Accessories'),
        or(
          isNotNull(products.accessoryType),
          isNotNull(products.compatibility),
          isNotNull(products.materialFinish),
          isNotNull(products.mountType)
        )
      ))
      .limit(2000); // Process first 2000 processed accessories

    console.log(`📊 Found ${processedAccessories.length} processed accessories to sync`);

    if (processedAccessories.length === 0) {
      console.log('⏳ No processed accessories found yet. Waiting for extraction to complete...');
      return;
    }

    // Count coverage
    const withAccessoryType = processedAccessories.filter(p => p.accessoryType).length;
    const withCompatibility = processedAccessories.filter(p => p.compatibility).length;
    const withMaterialFinish = processedAccessories.filter(p => p.materialFinish).length;
    const withMountType = processedAccessories.filter(p => p.mountType).length;

    console.log(`📈 Filter Coverage:`);
    console.log(`   - Accessory Type: ${withAccessoryType}/${processedAccessories.length} (${(withAccessoryType/processedAccessories.length*100).toFixed(1)}%)`);
    console.log(`   - Compatibility: ${withCompatibility}/${processedAccessories.length} (${(withCompatibility/processedAccessories.length*100).toFixed(1)}%)`);
    console.log(`   - Material/Finish: ${withMaterialFinish}/${processedAccessories.length} (${(withMaterialFinish/processedAccessories.length*100).toFixed(1)}%)`);
    console.log(`   - Mount Type: ${withMountType}/${processedAccessories.length} (${(withMountType/processedAccessories.length*100).toFixed(1)}%)`);

    // Transform for Algolia
    const algoliaUpdates: AlgoliaProduct[] = processedAccessories.map(product => ({
      objectID: product.sku,
      accessoryType: product.accessoryType || undefined,
      compatibility: product.compatibility || undefined,
      material: product.materialFinish || undefined,
      mountType: product.mountType || undefined,
    }));

    // Remove undefined values
    algoliaUpdates.forEach(product => {
      Object.keys(product).forEach(key => {
        if (product[key] === undefined) {
          delete product[key];
        }
      });
    });

    console.log(`🎯 Syncing ${algoliaUpdates.length} products to Algolia...`);

    // Sync to Algolia using batch partial update
    const batchUpdatePayload = {
      requests: algoliaUpdates.map(product => ({
        action: 'partialUpdateObject',
        objectID: product.objectID,
        body: product
      }))
    };

    try {
      console.log(`🎯 Syncing ${algoliaUpdates.length} products to Algolia...`);
      
      const response = await axios.post(
        `${ALGOLIA_BASE_URL}/batch`,
        batchUpdatePayload,
        {
          headers: {
            'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
            'X-Algolia-Application-Id': ALGOLIA_APP_ID,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`📤 Batch sync response: ${response.status} - ${response.data.taskID}`);
      
    } catch (error) {
      console.error('❌ Error syncing to Algolia:', error);
      throw error;
    }

    console.log(`✅ Continuous accessory sync completed successfully`);
    console.log(`📊 Updated ${algoliaUpdates.length} products with accessory filter data`);
    
  } catch (error) {
    console.error('❌ Error during continuous sync:', error);
    throw error;
  }
}

// Execute the sync
continuousAccessorySync()
  .then(() => {
    console.log('🎉 Continuous accessory sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Continuous sync failed:', error);
    process.exit(1);
  });