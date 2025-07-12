/**
 * Sync Sight Types to Algolia
 * Updates sight type data for all long guns in Algolia search index
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function syncSightTypesToAlgolia() {
  console.log('🔧 Starting sight type sync to Algolia...');
  
  // Get all long guns with sight type data
  const longGuns = await db
    .select()
    .from(products)
    .where(eq(products.departmentNumber, '05'));
  
  console.log(`📊 Found ${longGuns.length} long guns with sight type data`);
  
  // Count by subcategory
  const rifles = longGuns.filter(p => p.subcategoryName === 'Rifles');
  const shotguns = longGuns.filter(p => p.subcategoryName === 'Shotguns');
  
  console.log(`📊 Rifles: ${rifles.length}, Shotguns: ${shotguns.length}`);
  
  // Batch update Algolia using HTTP API
  const batchSize = 50;
  let updateCount = 0;
  
  for (let i = 0; i < longGuns.length; i += batchSize) {
    const batch = longGuns.slice(i, i + batchSize);
    
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku || product.stockNumber,
      sightType: product.sightType || 'Standard'
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
        break;
      }
      
      updateCount += batch.length;
      console.log(`✅ Updated ${updateCount}/${longGuns.length} products`);
      
      // Minimal delay to avoid rate limiting
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error updating batch:`, error);
      break;
    }
  }
  
  console.log(`🎯 Successfully synced sight type data for ${updateCount} products`);
  console.log(`📊 Coverage: Rifles (${rifles.length}), Shotguns (${shotguns.length})`);
  console.log('✅ Sight type sync completed');
}

// Run the sync
syncSightTypesToAlgolia()
  .then(() => {
    console.log('✅ Sight type Algolia sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sight type Algolia sync failed:', error);
    process.exit(1);
  });

export { syncSightTypesToAlgolia };