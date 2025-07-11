/**
 * Sync All Filter Data to Algolia
 * Updates all products with filter fields and promotional flags
 */

import { algoliasearch } from 'algoliasearch';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Missing Algolia credentials');
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

async function syncAllFiltersToAlgolia() {
  try {
    console.log('🔄 Starting comprehensive filter sync to Algolia...');
    
    // Get all products with any filter data or promotional flags
    const allProducts = await db.execute(sql`
      SELECT 
        sku,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type,
        new_item,
        internal_special,
        drop_shippable,
        department_number
      FROM products 
      WHERE sku IS NOT NULL
      ORDER BY department_number, id
    `);
    
    console.log(`📊 Found ${allProducts.rows.length} products to sync`);
    
    // Update Algolia in batches
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < allProducts.rows.length; i += batchSize) {
      const batch = allProducts.rows.slice(i, i + batchSize);
      
      // Prepare batch update objects
      const updates = batch.map(product => ({
        objectID: product.sku,
        barrelLength: product.barrel_length || null,
        finish: product.finish || null,
        frameSize: product.frame_size || null,
        actionType: product.action_type || null,
        sightType: product.sight_type || null,
        newItem: product.new_item || false,
        internalSpecial: product.internal_special || false,
        dropShippable: product.drop_shippable !== false // Default to true unless explicitly false
      }));
      
      // Send batch update to Algolia
      const response = await client.partialUpdateObjects({
        indexName: 'products',
        objects: updates
      });
      
      updated += batch.length;
      
      console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.rows.length / batchSize)}: ${updated}/${allProducts.rows.length} products`);
      
      // Wait a bit between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n🎉 Successfully synced ${updated} products to Algolia`);
    
    // Get filter statistics
    const filterStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_products,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type,
        SUM(CASE WHEN new_item = true THEN 1 ELSE 0 END) as new_items,
        SUM(CASE WHEN internal_special = true THEN 1 ELSE 0 END) as internal_specials,
        SUM(CASE WHEN drop_shippable = false THEN 1 ELSE 0 END) as warehouse_only
      FROM products
    `);
    
    const stats = filterStats.rows[0];
    console.log(`\n📈 Filter data coverage:`);
    console.log(`   - Total products: ${stats.total_products}`);
    console.log(`   - With barrel length: ${stats.with_barrel_length}`);
    console.log(`   - With finish: ${stats.with_finish}`);
    console.log(`   - With frame size: ${stats.with_frame_size}`);
    console.log(`   - With action type: ${stats.with_action_type}`);
    console.log(`   - With sight type: ${stats.with_sight_type}`);
    console.log(`   - New items: ${stats.new_items}`);
    console.log(`   - Internal specials: ${stats.internal_specials}`);
    console.log(`   - Warehouse only: ${stats.warehouse_only}`);
    
    // Test facets for different departments
    console.log('\n🔍 Testing facets by department...');
    
    const deptTests = [
      { dept: '01', name: 'Handguns' },
      { dept: '05', name: 'Long Guns' },
      { dept: '08', name: 'Optics' },
      { dept: '06', name: 'NFA Products' }
    ];
    
    for (const dept of deptTests) {
      try {
        const testResponse = await client.search({
          requests: [
            {
              indexName: 'products',
              params: {
                query: '',
                facets: ['barrelLength', 'finish', 'frameSize', 'actionType', 'sightType'],
                filters: `departmentNumber:"${dept.dept}"`,
                maxFacetHits: 5
              }
            }
          ]
        });
        
        const facets = testResponse.results[0].facets;
        console.log(`   📊 ${dept.name} (Dept ${dept.dept}):`);
        console.log(`      - Barrel lengths: ${Object.keys(facets?.barrelLength || {}).length}`);
        console.log(`      - Finishes: ${Object.keys(facets?.finish || {}).length}`);
        console.log(`      - Frame sizes: ${Object.keys(facets?.frameSize || {}).length}`);
        console.log(`      - Action types: ${Object.keys(facets?.actionType || {}).length}`);
        console.log(`      - Sight types: ${Object.keys(facets?.sightType || {}).length}`);
        
      } catch (error) {
        console.log(`   ❌ Error testing ${dept.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Comprehensive filter sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing filters:', error);
    throw error;
  }
}

// Run the sync
syncAllFiltersToAlgolia().catch(console.error);