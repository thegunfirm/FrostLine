/**
 * Sync Rifle Finish Data to Algolia
 * Update Algolia index with new rifle finish data
 */

import { Pool } from 'pg';

async function syncRifleFinish() {
  console.log('📊 Syncing Rifle Finish Data to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all rifles with finish data
    const riflesWithFinish = await client.query(`
      SELECT id, sku, name, finish, department_number, category
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND finish IS NOT NULL 
        AND finish != ''
      ORDER BY id
    `);
    
    console.log(`Found ${riflesWithFinish.rows.length} rifles with finish data`);
    
    // Prepare Algolia updates
    const algoliaUpdates = riflesWithFinish.rows.map(rifle => ({
      objectID: rifle.sku,
      finish: rifle.finish
    }));
    
    // Send updates to Algolia in batches
    const batchSize = 1000;
    let synced = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
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
            objectID: update.objectID,
            body: { finish: update.finish }
          }))
        })
      });
      
      if (response.ok) {
        synced += batch.length;
        console.log(`Synced ${synced}/${algoliaUpdates.length} rifles...`);
      } else {
        console.error(`Failed to sync batch: ${response.status}`);
      }
    }
    
    console.log(`Successfully synced ${synced} rifles to Algolia`);
    
    // Verify Algolia finish facets
    const facetResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
        facets: ['finish']
      })
    });
    
    const facetResult = await facetResponse.json();
    
    if (facetResult.facets && facetResult.facets.finish) {
      console.log('\n✅ Rifle finish facets updated:');
      const finishes = facetResult.facets.finish;
      Object.entries(finishes).slice(0, 15).forEach(([finish, count]) => {
        console.log(`  ${finish}: ${count} rifles`);
      });
      
      const totalFacetCount = Object.values(finishes).reduce((sum: number, count: number) => sum + count, 0);
      console.log(`\nTotal rifles with finish facets: ${totalFacetCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncRifleFinish().catch(console.error);