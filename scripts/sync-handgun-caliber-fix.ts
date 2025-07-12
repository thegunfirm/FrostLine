/**
 * Sync Handgun Caliber Data Fix
 * Fix the missing caliber facet for handguns in Algolia
 */

import { Pool } from 'pg';

async function syncHandgunCaliberFix() {
  console.log('🔧 Fixing Handgun Caliber Data in Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handguns with caliber data
    const handgunsWithCaliber = await client.query(`
      SELECT id, sku, name, caliber, department_number, category
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
      ORDER BY id
    `);
    
    console.log(`Found ${handgunsWithCaliber.rows.length} handguns with caliber data`);
    
    // Prepare Algolia updates - only caliber field
    const algoliaUpdates = handgunsWithCaliber.rows.map(handgun => ({
      objectID: handgun.sku,
      caliber: handgun.caliber
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
        console.log(`Synced ${synced}/${algoliaUpdates.length} handguns...`);
      } else {
        console.error(`Failed to sync batch: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
      }
    }
    
    console.log(`Successfully synced ${synced} handgun calibers to Algolia`);
    
    // Test a few specific handguns to verify sync
    console.log('\n🔍 Testing specific handgun SKUs in Algolia...');
    const testSKUs = handgunsWithCaliber.rows.slice(0, 3).map(h => h.sku);
    
    for (const sku of testSKUs) {
      const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${sku}`, {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        }
      });
      
      if (testResponse.ok) {
        const record = await testResponse.json();
        console.log(`✓ ${sku}: caliber="${record.caliber}" in Algolia`);
      } else {
        console.log(`❌ ${sku}: Failed to retrieve from Algolia`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncHandgunCaliberFix().catch(console.error);