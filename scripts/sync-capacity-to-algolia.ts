/**
 * Sync Capacity Data to Algolia
 * Updates Algolia index with capacity information for handgun products
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function syncCapacityToAlgolia() {
  try {
    console.log('🔄 Syncing capacity data to Algolia...');
    
    // Get all handgun products with capacity
    const handgunsWithCapacity = await db
      .select({
        id: products.id,
        sku: products.sku,
        capacity: products.capacity
      })
      .from(products)
      .where(and(
        eq(products.departmentNumber, '01'),
        isNotNull(products.capacity)
      ));

    console.log(`📊 Found ${handgunsWithCapacity.length} handgun products with capacity`);

    // Prepare update objects for Algolia
    const updates = handgunsWithCapacity.map(product => ({
      objectID: product.sku,
      capacity: product.capacity
    }));

    // Update Algolia in batches
    const batchSize = 1000;
    let updated = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`https://QWHWU806V0-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch.map(update => ({
              action: 'partialUpdateObject',
              body: update
            }))
          })
        });

        if (response.ok) {
          updated += batch.length;
          console.log(`✅ Updated ${updated}/${updates.length} products in Algolia`);
        } else {
          console.error('❌ Algolia batch update failed:', await response.text());
        }
      } catch (error) {
        console.error('❌ Error updating Algolia batch:', error);
      }
    }

    console.log(`\n📈 Capacity sync complete:`);
    console.log(`   • Products with capacity: ${handgunsWithCapacity.length}`);
    console.log(`   • Successfully updated: ${updated}`);
    console.log(`   • Success rate: ${((updated / handgunsWithCapacity.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error syncing capacity to Algolia:', error);
  }
}

// Run the sync
syncCapacityToAlgolia().then(() => {
  console.log('✅ Capacity sync to Algolia complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});