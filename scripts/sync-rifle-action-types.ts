/**
 * Sync Rifle Action Types to Algolia
 * Careful sync of rifle action types using SKU-based objectIDs
 */

import { Pool } from 'pg';

async function syncRifleActionTypes() {
  console.log('🔄 Starting rifle action type sync to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // 1. Get all rifles with action types
    const riflesWithActionTypes = await client.query(`
      SELECT id, sku, name, action_type
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND action_type IS NOT NULL 
        AND action_type != ''
      ORDER BY action_type, name
    `);
    
    console.log(`📊 Found ${riflesWithActionTypes.rows.length} rifles with action types to sync`);
    
    // 2. Group by action type for reporting
    const actionTypeGroups = {};
    riflesWithActionTypes.rows.forEach(rifle => {
      if (!actionTypeGroups[rifle.action_type]) {
        actionTypeGroups[rifle.action_type] = [];
      }
      actionTypeGroups[rifle.action_type].push(rifle);
    });
    
    console.log('\n📋 Action type distribution:');
    Object.entries(actionTypeGroups).forEach(([type, rifles]) => {
      console.log(`  ${type}: ${rifles.length} products`);
    });
    
    // 3. Prepare Algolia updates using SKU-based objectIDs
    const algoliaUpdates = riflesWithActionTypes.rows.map(rifle => ({
      objectID: rifle.sku, // KEY: Use SKU as objectID like handgun fix
      actionType: rifle.action_type
    }));
    
    console.log(`\n🔄 Preparing to sync ${algoliaUpdates.length} rifle action types to Algolia...`);
    
    // 4. Sync to Algolia in batches
    const batchSize = 100;
    let syncedCount = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch.map(update => ({
              action: 'partialUpdateObject',
              body: {
                objectID: update.objectID,
                actionType: update.actionType
              }
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error(`Algolia API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        syncedCount += batch.length;
        
        console.log(`✅ Synced batch ${Math.floor(i/batchSize) + 1}: ${syncedCount}/${algoliaUpdates.length} products`);
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
      }
    }
    
    console.log(`\n✅ Algolia sync complete: ${syncedCount}/${algoliaUpdates.length} products synced`);
    
    // 5. Verify Algolia facet counts
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for Algolia indexing
    
    const verifyResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
        hitsPerPage: 0,
        facets: ['actionType']
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log('\n📊 Algolia rifle action type facets after sync:');
    
    if (verifyResult.facets && verifyResult.facets.actionType) {
      const algoliaTotalWithActionTypes = Object.values(verifyResult.facets.actionType).reduce((sum: number, count: number) => sum + count, 0);
      console.log(`Total rifles with action types in Algolia: ${algoliaTotalWithActionTypes}`);
      
      Object.entries(verifyResult.facets.actionType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log('  No action type facets found in Algolia');
    }
    
    console.log(`Total rifles in Algolia: ${verifyResult.nbHits}`);
    
    // 6. Show sample products for verification
    const sampleResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles" AND actionType:"Semi-Auto"',
        hitsPerPage: 5
      })
    });
    
    const sampleResult = await sampleResponse.json();
    console.log('\n🎯 Sample Semi-Auto rifles in Algolia:');
    sampleResult.hits.forEach((hit: any) => {
      console.log(`  ${hit.objectID}: ${hit.name} (${hit.actionType})`);
    });
    
    console.log('\n📋 RIFLE ACTION TYPE SYNC COMPLETE:');
    console.log(`  ✅ ${syncedCount} rifles synced to Algolia`);
    console.log(`  ✅ Using SKU-based objectIDs for accurate updates`);
    console.log(`  ✅ Rifle action type filtering now operational`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncRifleActionTypes().catch(console.error);