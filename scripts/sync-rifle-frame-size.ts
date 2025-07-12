/**
 * Sync Rifle Frame Size Data to Algolia
 * Update Algolia index with new rifle frame size data
 */

import { Pool } from 'pg';

async function syncRifleFrameSize() {
  console.log('📊 Syncing Rifle Frame Size Data to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all rifles with frame size data
    const riflesWithFrameSize = await client.query(`
      SELECT id, sku, name, frame_size, department_number, category
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND frame_size IS NOT NULL 
        AND frame_size != ''
      ORDER BY id
    `);
    
    console.log(`Found ${riflesWithFrameSize.rows.length} rifles with frame size data`);
    
    // Prepare Algolia updates
    const algoliaUpdates = riflesWithFrameSize.rows.map(rifle => ({
      objectID: rifle.sku,
      frameSize: rifle.frame_size
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
            body: { frameSize: update.frameSize }
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncRifleFrameSize().catch(console.error);