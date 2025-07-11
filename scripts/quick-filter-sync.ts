/**
 * Quick Filter Sync - Test filter data sync for rifles
 * Updates a small batch of rifle products to test filtering
 */

import { algoliasearch } from 'algoliasearch';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Missing Algolia credentials');
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

async function quickFilterSync() {
  try {
    console.log('🔄 Starting quick filter sync for rifles...');
    
    // Get sample rifle products with filter data
    const rifleProducts = await db.execute(sql`
      SELECT 
        sku,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type,
        new_item,
        internal_special,
        drop_shippable,
        department_number
      FROM products 
      WHERE department_number = '05'
      AND sku IS NOT NULL
      AND (
        barrel_length IS NOT NULL OR 
        finish IS NOT NULL OR 
        frame_size IS NOT NULL OR 
        action_type IS NOT NULL OR 
        sight_type IS NOT NULL
      )
      LIMIT 200
    `);
    
    console.log(`📊 Found ${rifleProducts.rows.length} rifle products to sync`);
    
    if (rifleProducts.rows.length === 0) {
      console.log('⚠️  No rifle products found');
      return;
    }
    
    // Prepare batch update objects
    const updates = rifleProducts.rows.map(product => ({
      objectID: product.sku,
      barrelLength: product.barrel_length || null,
      finish: product.finish || null,
      frameSize: product.frame_size || null,
      actionType: product.action_type || null,
      sightType: product.sight_type || null,
      newItem: product.new_item || false,
      internalSpecial: product.internal_special || false,
      dropShippable: product.drop_shippable !== false
    }));
    
    // Send batch update to Algolia
    const response = await client.partialUpdateObjects({
      indexName: 'products',
      objects: updates
    });
    
    console.log(`✅ Successfully synced ${updates.length} rifle products to Algolia`);
    
    // Show sample of what was updated
    const sampleUpdates = updates.slice(0, 5);
    console.log('\n📋 Sample updates:');
    sampleUpdates.forEach((update, i) => {
      console.log(`   ${i + 1}. ${update.objectID}:`);
      console.log(`      - Barrel Length: ${update.barrelLength}`);
      console.log(`      - Finish: ${update.finish}`);
      console.log(`      - Frame Size: ${update.frameSize}`);
      console.log(`      - Action Type: ${update.actionType}`);
      console.log(`      - Sight Type: ${update.sightType}`);
    });
    
    console.log('\n🎉 Quick filter sync completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error during quick filter sync:', error);
    throw error;
  }
}

// Run the sync
quickFilterSync().catch(console.error);