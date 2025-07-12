/**
 * Sync Rifle and Shotgun Caliber Fix to Algolia
 * Update the 156 products that were recategorized
 */

import { Pool } from 'pg';

async function syncRifleShotgunCaliberFix() {
  console.log('🔄 Syncing rifle and shotgun caliber fixes to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all long guns (rifles and shotguns) that need to be synced
    const longGuns = await client.query(`
      SELECT sku, category, caliber, department_number
      FROM products 
      WHERE department_number = '05' 
        AND category IN ('Rifles', 'Shotguns')
        AND caliber IS NOT NULL 
        AND caliber != ''
      ORDER BY category, caliber
    `);
    
    console.log(`Found ${longGuns.rows.length} long guns to sync to Algolia`);
    
    // Prepare Algolia updates
    const algoliaUpdates = longGuns.rows.map(product => ({
      objectID: product.sku,
      categoryName: product.category,
      caliber: product.caliber
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
            body: { 
              categoryName: update.categoryName,
              caliber: update.caliber
            }
          }))
        })
      });
      
      if (response.ok) {
        synced += batch.length;
        console.log(`Synced ${synced}/${algoliaUpdates.length} long guns...`);
      } else {
        console.error(`Failed to sync batch: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
      }
    }
    
    console.log(`✅ Successfully synced ${synced} long guns to Algolia`);
    
    // Test rifle caliber facets
    console.log('\n🔍 Testing rifle caliber facets...');
    const rifleCaliberTest = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Rifles',
        facets: ['caliber'],
        maxValuesPerFacet: 10,
        hitsPerPage: 0
      })
    });
    
    if (rifleCaliberTest.ok) {
      const rifleResult = await rifleCaliberTest.json();
      console.log(`✅ Rifle caliber facets (${rifleResult.nbHits} rifles):`);
      const topRifleCalibers = Object.entries(rifleResult.facets?.caliber || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10);
      topRifleCalibers.forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count} rifles`);
      });
    } else {
      console.log('❌ Failed to test rifle caliber facets');
    }
    
    // Test shotgun caliber facets
    console.log('\n🔍 Testing shotgun caliber facets...');
    const shotgunCaliberTest = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Shotguns',
        facets: ['caliber'],
        maxValuesPerFacet: 10,
        hitsPerPage: 0
      })
    });
    
    if (shotgunCaliberTest.ok) {
      const shotgunResult = await shotgunCaliberTest.json();
      console.log(`✅ Shotgun caliber facets (${shotgunResult.nbHits} shotguns):`);
      const allShotgunCalibers = Object.entries(shotgunResult.facets?.caliber || {})
        .sort(([,a], [,b]) => (b as number) - (a as number));
      allShotgunCalibers.forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count} shotguns`);
      });
    } else {
      console.log('❌ Failed to test shotgun caliber facets');
    }
    
    // Verify no gauge calibers in rifles
    console.log('\n🔍 Verifying no gauge calibers in rifles...');
    const rifleGaugeCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Rifles AND (caliber:"12 Gauge" OR caliber:"20 Gauge" OR caliber:"410 Gauge")',
        hitsPerPage: 0
      })
    });
    
    if (rifleGaugeCheck.ok) {
      const gaugeResult = await rifleGaugeCheck.json();
      if (gaugeResult.nbHits === 0) {
        console.log('✅ No gauge calibers found in rifles');
      } else {
        console.log(`❌ Still ${gaugeResult.nbHits} gauge calibers in rifles`);
      }
    }
    
    // Verify no rifle calibers in shotguns
    console.log('\n🔍 Verifying no rifle calibers in shotguns...');
    const shotgunRifleCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Shotguns AND (caliber:"22 LR" OR caliber:"223 Remington" OR caliber:"308")',
        hitsPerPage: 0
      })
    });
    
    if (shotgunRifleCheck.ok) {
      const rifleResult = await shotgunRifleCheck.json();
      if (rifleResult.nbHits === 0) {
        console.log('✅ No rifle calibers found in shotguns');
      } else {
        console.log(`❌ Still ${rifleResult.nbHits} rifle calibers in shotguns`);
      }
    }
    
    console.log('\n🎉 Rifle and shotgun caliber sync complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

syncRifleShotgunCaliberFix().catch(console.error);