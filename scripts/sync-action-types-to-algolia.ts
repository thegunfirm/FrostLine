/**
 * Sync Action Types to Algolia
 * Updates action type data for all long guns in Algolia search index
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function syncActionTypesToAlgolia() {
  console.log('🔧 Starting action type sync to Algolia...');
  
  // Get all long guns (department 05) with action type data
  const longGunsWithActionType = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '05'),
        isNotNull(products.actionType)
      )
    );
  
  console.log(`📊 Found ${longGunsWithActionType.length} long guns with action type data`);
  
  // Count by action type
  const actionTypeCount: { [key: string]: number } = {};
  longGunsWithActionType.forEach(product => {
    const actionType = product.actionType || 'Unknown';
    actionTypeCount[actionType] = (actionTypeCount[actionType] || 0) + 1;
  });
  
  console.log(`📊 Action Type Distribution:`);
  Object.entries(actionTypeCount)
    .sort(([,a], [,b]) => b - a)
    .forEach(([actionType, count]) => {
      console.log(`   ${actionType}: ${count} products`);
    });
  
  // Batch update Algolia using HTTP API
  const batchSize = 50;
  let updateCount = 0;
  
  for (let i = 0; i < longGunsWithActionType.length; i += batchSize) {
    const batch = longGunsWithActionType.slice(i, i + batchSize);
    
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku || product.stockNumber,
      actionType: product.actionType
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
      console.log(`✅ Updated ${updateCount}/${longGunsWithActionType.length} products`);
      
      // Minimal delay to avoid rate limiting
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error updating batch:`, error);
      break;
    }
  }
  
  console.log(`🎯 Successfully synced action type data for ${updateCount} products`);
  console.log(`📊 Final action type distribution synchronized to Algolia`);
  
  return {
    total: longGunsWithActionType.length,
    updated: updateCount,
    actionTypes: actionTypeCount
  };
}

// Run the sync
syncActionTypesToAlgolia()
  .then((result) => {
    console.log('✅ Action type sync to Algolia completed');
    console.log(`🎯 Synced ${result.updated} products with action type data`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Action type sync to Algolia failed:', error);
    process.exit(1);
  });

export { syncActionTypesToAlgolia };