/**
 * Sync Complete Shotgun Caliber Data to Algolia
 * Update Algolia index with complete shotgun caliber data
 */

import { Pool } from 'pg';

async function syncShotgunCaliberComplete() {
  console.log('📊 Syncing Complete Shotgun Caliber Data to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all shotguns with caliber data
    const shotgunsWithCaliber = await client.query(`
      SELECT id, sku, name, caliber, department_number, category
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
      ORDER BY id
    `);
    
    console.log(`Found ${shotgunsWithCaliber.rows.length} shotguns with caliber data`);
    
    // Prepare Algolia updates
    const algoliaUpdates = shotgunsWithCaliber.rows.map(shotgun => ({
      objectID: shotgun.sku,
      caliber: shotgun.caliber
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
            body: { caliber: update.caliber }
          }))
        })
      });
      
      if (response.ok) {
        synced += batch.length;
        console.log(`Synced ${synced}/${algoliaUpdates.length} shotguns...`);
      } else {
        console.error(`Failed to sync batch: ${response.status}`);
      }
    }
    
    console.log(`Successfully synced ${synced} shotguns to Algolia`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncShotgunCaliberComplete().catch(console.error);