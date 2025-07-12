/**
 * Sync Ammunition Calibers to Algolia
 * Updates caliber data for all ammunition products in Algolia search index
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function syncAmmoCalibersToAlgolia() {
  console.log('🔧 Starting ammunition caliber sync to Algolia...');
  
  // Get all ammunition products (department 18) with caliber data
  const ammunitionWithCaliber = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '18'),
        isNotNull(products.caliber)
      )
    );
  
  console.log(`📊 Found ${ammunitionWithCaliber.length} ammunition products with caliber data`);
  
  // Count by caliber
  const caliberCount: { [key: string]: number } = {};
  ammunitionWithCaliber.forEach(product => {
    const caliber = product.caliber || 'Unknown';
    caliberCount[caliber] = (caliberCount[caliber] || 0) + 1;
  });
  
  console.log(`📊 Top 10 Caliber Distribution:`);
  Object.entries(caliberCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([caliber, count]) => {
      console.log(`   ${caliber}: ${count} products`);
    });
  
  // Batch update Algolia using HTTP API
  const batchSize = 50;
  let updateCount = 0;
  
  for (let i = 0; i < ammunitionWithCaliber.length; i += batchSize) {
    const batch = ammunitionWithCaliber.slice(i, i + batchSize);
    
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku || product.stockNumber,
      caliber: product.caliber
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
        break;
      }
      
      updateCount += batch.length;
      console.log(`✅ Updated ${updateCount}/${ammunitionWithCaliber.length} products`);
      
      // Small delay to avoid rate limiting
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error updating batch:`, error);
      break;
    }
  }
  
  console.log(`🎯 Successfully synced caliber data for ${updateCount} ammunition products`);
  console.log(`📊 Final caliber distribution synchronized to Algolia`);
  
  return {
    total: ammunitionWithCaliber.length,
    updated: updateCount,
    calibers: caliberCount
  };
}

// Run the sync
syncAmmoCalibersToAlgolia()
  .then((result) => {
    console.log('✅ Ammunition caliber sync to Algolia completed');
    console.log(`🎯 Synced ${result.updated} products with caliber data`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ammunition caliber sync to Algolia failed:', error);
    process.exit(1);
  });

export { syncAmmoCalibersToAlgolia };