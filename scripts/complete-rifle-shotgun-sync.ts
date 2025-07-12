/**
 * Complete Rifle and Shotgun Sync
 * Final comprehensive sync to ensure all 4,156 long guns are properly categorized
 */

import { Pool } from 'pg';

async function completeRifleShotgunSync() {
  console.log('🔄 Complete rifle and shotgun sync to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all long guns from database with current correct data
    const allLongGuns = await client.query(`
      SELECT 
        sku, name, description, manufacturer, category, department_number,
        stock_quantity, drop_shippable, upc_code, weight, caliber, capacity,
        price_bronze, price_gold, price_platinum, new_item, internal_special,
        price_wholesale, price_map, price_msrp, requires_ffl, manufacturer_part_number
      FROM products 
      WHERE department_number = '05' 
        AND category IN ('Rifles', 'Shotguns')
      ORDER BY category, caliber
    `);
    
    console.log(`📊 Found ${allLongGuns.rows.length} long guns in database`);
    
    // Count rifles and shotguns
    const rifles = allLongGuns.rows.filter(p => p.category === 'Rifles');
    const shotguns = allLongGuns.rows.filter(p => p.category === 'Shotguns');
    
    console.log(`  - Rifles: ${rifles.length}`);
    console.log(`  - Shotguns: ${shotguns.length}`);
    
    // Transform to Algolia format
    const algoliaObjects = allLongGuns.rows.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      departmentNumber: product.department_number,
      stockNumber: product.sku,
      inventoryQuantity: product.stock_quantity,
      inStock: product.stock_quantity > 0,
      dropShippable: product.drop_shippable,
      upc: product.upc_code,
      weight: product.weight,
      caliber: product.caliber,
      capacity: product.capacity,
      tierPricing: {
        bronze: product.price_bronze,
        gold: product.price_gold,
        platinum: product.price_platinum
      },
      newItem: product.new_item,
      internalSpecial: product.internal_special,
      retailPrice: product.price_wholesale,
      retailMap: product.price_map,
      msrp: product.price_msrp,
      dealerPrice: product.price_wholesale,
      price: product.price_platinum,
      fflRequired: product.requires_ffl,
      mpn: product.manufacturer_part_number
    }));
    
    // Sync to Algolia in batches
    const batchSize = 1000;
    let synced = 0;
    
    for (let i = 0; i < algoliaObjects.length; i += batchSize) {
      const batch = algoliaObjects.slice(i, i + batchSize);
      
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batch.map(obj => ({
            action: 'updateObject',
            objectID: obj.objectID,
            body: obj
          }))
        })
      });
      
      if (response.ok) {
        synced += batch.length;
        console.log(`✅ Synced ${synced}/${algoliaObjects.length} long guns...`);
      } else {
        console.error(`❌ Failed to sync batch: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
      }
    }
    
    console.log(`🎉 Successfully synced ${synced} long guns to Algolia`);
    
    // Wait for indexing to complete
    console.log('\n⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final verification - test rifle calibers
    console.log('\n🔍 Final verification - rifle calibers:');
    const rifleTest = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
        maxValuesPerFacet: 15,
        hitsPerPage: 0
      })
    });
    
    if (rifleTest.ok) {
      const rifleResult = await rifleTest.json();
      console.log(`✅ Rifle calibers (${rifleResult.nbHits} rifles):`);
      const topRifleCalibers = Object.entries(rifleResult.facets?.caliber || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 15);
      topRifleCalibers.forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count} rifles`);
      });
    } else {
      console.log('❌ Failed to test rifle calibers');
    }
    
    // Final verification - test shotgun calibers
    console.log('\n🔍 Final verification - shotgun calibers:');
    const shotgunTest = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
        maxValuesPerFacet: 15,
        hitsPerPage: 0
      })
    });
    
    if (shotgunTest.ok) {
      const shotgunResult = await shotgunTest.json();
      console.log(`✅ Shotgun calibers (${shotgunResult.nbHits} shotguns):`);
      const allShotgunCalibers = Object.entries(shotgunResult.facets?.caliber || {})
        .sort(([,a], [,b]) => (b as number) - (a as number));
      allShotgunCalibers.forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count} shotguns`);
      });
    } else {
      console.log('❌ Failed to test shotgun calibers');
    }
    
    // Check for any remaining misplaced calibers
    console.log('\n🔍 Checking for any remaining misplaced calibers...');
    
    const gaugeInRifles = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Rifles AND (caliber:"12 Gauge" OR caliber:"20 Gauge" OR caliber:"410 Gauge" OR caliber:"28 Gauge" OR caliber:"16 Gauge")',
        hitsPerPage: 0
      })
    });
    
    if (gaugeInRifles.ok) {
      const gaugeResult = await gaugeInRifles.json();
      if (gaugeResult.nbHits === 0) {
        console.log('✅ No gauge calibers found in rifles');
      } else {
        console.log(`❌ Found ${gaugeResult.nbHits} gauge calibers still in rifles`);
      }
    }
    
    const rifleInShotguns = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Shotguns AND (caliber:"22 LR" OR caliber:"223 Remington" OR caliber:"308" OR caliber:"9mm")',
        hitsPerPage: 0
      })
    });
    
    if (rifleInShotguns.ok) {
      const rifleResult = await rifleInShotguns.json();
      if (rifleResult.nbHits === 0) {
        console.log('✅ No rifle calibers found in shotguns');
      } else {
        console.log(`❌ Found ${rifleResult.nbHits} rifle calibers still in shotguns`);
      }
    }
    
    console.log('\n🎉 Complete rifle and shotgun caliber sync finished!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

completeRifleShotgunSync().catch(console.error);