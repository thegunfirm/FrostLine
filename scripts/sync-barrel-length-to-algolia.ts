/**
 * Sync Barrel Length to Algolia for Rifles and Shotguns
 * Updates Algolia index with barrel length data from database
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function syncBarrelLengthToAlgolia() {
  console.log('🔧 Starting barrel length sync to Algolia...');
  
  // Get all long guns (department 05) with barrel length data
  const longGunsWithBarrelLength = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '05'),
        isNotNull(products.barrelLength)
      )
    );

  console.log(`📊 Found ${longGunsWithBarrelLength.length} long guns with barrel length data`);
  
  // Group by category (check all possible category names)
  const rifles = longGunsWithBarrelLength.filter(p => 
    p.subcategoryName?.includes('Rifles') || 
    p.category?.includes('Rifles') ||
    p.subcategoryName?.includes('Rifle') ||
    p.category?.includes('Rifle')
  );
  const shotguns = longGunsWithBarrelLength.filter(p => 
    p.subcategoryName?.includes('Shotguns') || 
    p.category?.includes('Shotguns') ||
    p.subcategoryName?.includes('Shotgun') ||
    p.category?.includes('Shotgun')
  );
  
  console.log(`📊 Rifles: ${rifles.length}, Shotguns: ${shotguns.length}`);
  console.log(`📊 Sample subcategories: ${[...new Set(longGunsWithBarrelLength.slice(0, 10).map(p => p.subcategoryName))].join(', ')}`);
  
  // Batch update Algolia using HTTP API
  const batchSize = 50; // Larger batch size for faster processing
  let updateCount = 0;
  
  for (let i = 0; i < longGunsWithBarrelLength.length; i += batchSize) {
    const batch = longGunsWithBarrelLength.slice(i, i + batchSize);
    
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku || product.stockNumber,
      barrelLength: product.barrelLength
    }));
    
    try {
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: algoliaUpdates.map(obj => ({
            action: 'partialUpdateObject',
            body: obj
          }))
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error! status: ${response.status}, response: ${errorText}`);
        console.error(`❌ Failed batch data:`, JSON.stringify(algoliaUpdates, null, 2));
        break; // Stop on error to avoid spam
      }
      
      updateCount += batch.length;
      console.log(`✅ Updated ${updateCount}/${longGunsWithBarrelLength.length} products`);
      
      // Minimal delay to avoid rate limiting
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error updating batch:`, error);
      break; // Stop on error
    }
  }
  
  console.log(`🎯 Successfully synced barrel length data for ${updateCount} products`);
  console.log(`📊 Coverage: Rifles (${rifles.length}), Shotguns (${shotguns.length})`);
}

// Run the sync if this file is executed directly
syncBarrelLengthToAlgolia()
  .then(() => {
    console.log('✅ Barrel length sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Barrel length sync failed:', error);
    process.exit(1);
  });

export { syncBarrelLengthToAlgolia };