/**
 * Check if handgun SKUs from database match Algolia objectIDs
 */

import { Pool } from 'pg';

async function checkAlgoliaHandgunMatch() {
  console.log('🔍 Checking handgun SKU match between database and Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get first 5 handgun SKUs from database
    const dbHandguns = await client.query(`
      SELECT sku, category 
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
      LIMIT 5
    `);
    
    console.log(`\nChecking ${dbHandguns.rows.length} handgun SKUs in Algolia:`);
    
    for (const handgun of dbHandguns.rows) {
      const sku = handgun.sku;
      
      // Check if this SKU exists in Algolia
      const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${sku}`, {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        }
      });
      
      if (algoliaResponse.ok) {
        const algoliaRecord = await algoliaResponse.json();
        console.log(`✓ ${sku}:`);
        console.log(`  - Database category: "${handgun.category}"`);
        console.log(`  - Algolia categoryName: "${algoliaRecord.categoryName}"`);
        console.log(`  - Algolia objectID: "${algoliaRecord.objectID}"`);
        console.log(`  - Match: ${algoliaRecord.objectID === sku ? 'YES' : 'NO'}`);
      } else {
        console.log(`❌ ${sku}: Not found in Algolia (${algoliaResponse.status})`);
      }
    }
    
    // Try to manually update one record to see if it works
    console.log('\n🔧 Testing manual update of one handgun record...');
    const testSKU = dbHandguns.rows[0]?.sku;
    if (testSKU) {
      const updateResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${testSKU}/partial`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categoryName: 'Handguns'
        })
      });
      
      if (updateResponse.ok) {
        console.log(`✓ Manual update successful for ${testSKU}`);
        
        // Verify the update worked
        const verifyResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${testSKU}`, {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          }
        });
        
        if (verifyResponse.ok) {
          const verifyRecord = await verifyResponse.json();
          console.log(`✓ Verification - ${testSKU} categoryName: "${verifyRecord.categoryName}"`);
        }
      } else {
        const errorText = await updateResponse.text();
        console.log(`❌ Manual update failed for ${testSKU}: ${updateResponse.status}`);
        console.log(`Error: ${errorText}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAlgoliaHandgunMatch().catch(console.error);