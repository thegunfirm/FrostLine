/**
 * Debug Rifle and Shotgun Sync Issue
 * Check why the Algolia sync didn't work correctly
 */

import { Pool } from 'pg';

async function debugRifleShotgunSync() {
  console.log('🔍 Debugging rifle and shotgun sync issue...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Check database state first
    console.log('\n📊 Current database state:');
    
    const rifleCountDB = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const shotgunCountDB = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
    `);
    
    console.log(`Database rifles: ${rifleCountDB.rows[0].count}`);
    console.log(`Database shotguns: ${shotgunCountDB.rows[0].count}`);
    
    // Check a few specific products that should have been moved
    console.log('\n🔍 Checking specific product examples:');
    
    // Check products that should now be shotguns
    const shouldBeShotguns = await client.query(`
      SELECT sku, category, caliber
      FROM products 
      WHERE sku IN ('REMR25549', 'MS50694', 'MS52150')
      ORDER BY sku
    `);
    
    console.log('Products that should be shotguns:');
    shouldBeShotguns.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.category} (${row.caliber})`);
    });
    
    // Check products that should now be rifles
    const shouldBeRifles = await client.query(`
      SELECT sku, category, caliber
      FROM products 
      WHERE sku IN ('CHP500-260', 'SV22440', 'SV22434')
      ORDER BY sku
    `);
    
    console.log('Products that should be rifles:');
    shouldBeRifles.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.category} (${row.caliber})`);
    });
    
    // Check if these products exist in Algolia with correct data
    console.log('\n🔍 Checking Algolia state for specific products:');
    
    for (const product of shouldBeShotguns.rows) {
      const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${product.sku}`, {
        method: 'GET',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      });
      
      if (algoliaResponse.ok) {
        const algoliaData = await algoliaResponse.json();
        console.log(`  ${product.sku}: DB=${product.category}, Algolia=${algoliaData.categoryName}`);
      } else {
        console.log(`  ${product.sku}: Not found in Algolia`);
      }
    }
    
    // Try a different approach - use saveObjects instead of partialUpdateObject
    console.log('\n🔄 Testing direct object save for specific products...');
    
    // Get complete data for a few products and save them directly
    const testProducts = await client.query(`
      SELECT *
      FROM products 
      WHERE sku IN ('REMR25549', 'MS50694', 'CHP500-260')
      ORDER BY sku
    `);
    
    const algoliaObjects = testProducts.rows.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: product.category,  // This should be the corrected category
      departmentNumber: product.department_number,
      stockNumber: product.sku,
      inventoryQuantity: product.inventory_quantity,
      inStock: product.inventory_quantity > 0,
      dropShippable: product.drop_shippable,
      upc: product.upc,
      weight: product.weight,
      caliber: product.caliber,
      capacity: product.capacity,
      tierPricing: {
        bronze: product.bronze_price,
        gold: product.gold_price,
        platinum: product.platinum_price
      },
      newItem: product.new_item,
      internalSpecial: product.internal_special,
      retailPrice: product.retail_price,
      retailMap: product.retail_map,
      msrp: product.msrp,
      dealerPrice: product.dealer_price,
      price: product.platinum_price,
      fflRequired: product.ffl_required,
      mpn: product.mpn
    }));
    
    console.log('Test products to save:');
    algoliaObjects.forEach(obj => {
      console.log(`  ${obj.objectID}: ${obj.categoryName} (${obj.caliber})`);
    });
    
    // Save these objects directly
    const saveResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: algoliaObjects.map(obj => ({
          action: 'updateObject',
          objectID: obj.objectID,
          body: obj
        }))
      })
    });
    
    if (saveResponse.ok) {
      console.log('✅ Test products saved successfully');
      
      // Wait a moment for indexing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test the facets again
      console.log('\n🔍 Testing facets after direct save...');
      
      const testFacets = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
          hitsPerPage: 0
        })
      });
      
      if (testFacets.ok) {
        const facetsResult = await testFacets.json();
        console.log(`Shotgun facets after direct save (${facetsResult.nbHits} shotguns):`);
        const shotgunCalibers = Object.entries(facetsResult.facets?.caliber || {})
          .sort(([,a], [,b]) => (b as number) - (a as number));
        shotgunCalibers.forEach(([caliber, count]) => {
          console.log(`  ${caliber}: ${count} shotguns`);
        });
      }
      
    } else {
      console.log('❌ Failed to save test products');
      const errorText = await saveResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugRifleShotgunSync().catch(console.error);