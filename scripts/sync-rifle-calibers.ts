/**
 * Sync Rifle Calibers to Algolia
 * Update Algolia index with new rifle caliber data
 */

import { Pool } from 'pg';

async function syncRifleCalibers() {
  console.log('📊 Syncing Rifle Calibers to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all rifles with caliber data
    const riflesWithCaliber = await client.query(`
      SELECT id, sku, name, caliber, department_number, category
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND caliber IS NOT NULL 
        AND caliber != ''
      ORDER BY id
    `);
    
    console.log(`Found ${riflesWithCaliber.rows.length} rifles with caliber data`);
    
    // Prepare Algolia updates
    const algoliaUpdates = [];
    
    for (const rifle of riflesWithCaliber.rows) {
      algoliaUpdates.push({
        objectID: rifle.sku,
        caliber: rifle.caliber
      });
    }
    
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
            body: { caliber: update.caliber }
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
    
    // Verify Algolia caliber facets
    console.log('\n📊 Verifying Algolia caliber facets...');
    
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
        facets: ['caliber']
      })
    });
    
    const facetResult = await facetResponse.json();
    
    if (facetResult.facets && facetResult.facets.caliber) {
      console.log('✅ Rifle caliber facets updated:');
      const calibers = facetResult.facets.caliber;
      Object.entries(calibers).slice(0, 10).forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count} rifles`);
      });
      
      const totalFacetCount = Object.values(calibers).reduce((sum: number, count: number) => sum + count, 0);
      console.log(`\nTotal rifles with caliber facets: ${totalFacetCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncRifleCalibers().catch(console.error);