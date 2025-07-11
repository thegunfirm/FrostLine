/**
 * Massive Filter Sync to Algolia
 * Syncs ALL products with any filter data to Algolia search index
 */

import { algoliasearch } from 'algoliasearch';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Missing Algolia credentials');
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

async function massiveFilterSync() {
  try {
    console.log('🔄 Starting massive filter sync to Algolia...');
    
    // Get ALL products with any filter data
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
        department_number,
        caliber,
        capacity
      FROM products 
      WHERE sku IS NOT NULL
      AND (
        barrel_length IS NOT NULL OR 
        finish IS NOT NULL OR 
        frame_size IS NOT NULL OR 
        action_type IS NOT NULL OR 
        sight_type IS NOT NULL OR
        caliber IS NOT NULL OR
        capacity IS NOT NULL
      )
      ORDER BY department_number, sku
    `);
    
    console.log(`📊 Found ${allProducts.rows.length} products with filter data to sync`);
    
    if (allProducts.rows.length === 0) {
      console.log('⚠️  No products with filter data found');
      return;
    }
    
    // Show breakdown by department
    const departmentCounts = {};
    allProducts.rows.forEach(product => {
      const dept = product.department_number || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    console.log('\n📋 Products by department:');
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`   - Dept ${dept}: ${count} products`);
    });
    
    // Process in larger batches for efficiency
    const batchSize = 200;
    let processed = 0;
    
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
        caliber: product.caliber || null,
        capacity: product.capacity || null,
        newItem: product.new_item || false,
        internalSpecial: product.internal_special || false,
        dropShippable: product.drop_shippable !== false
      }));
      
      // Send batch update to Algolia
      await client.partialUpdateObjects({
        indexName: 'products',
        objects: updates
      });
      
      processed += batch.length;
      
      console.log(`   ✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.rows.length / batchSize)} (${processed}/${allProducts.rows.length} products)`);
      
      // Small delay to be respectful to Algolia API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Successfully synced ${processed} products to Algolia!`);
    
    // Show detailed statistics
    const filterStats = {
      barrelLength: allProducts.rows.filter(p => p.barrel_length).length,
      finish: allProducts.rows.filter(p => p.finish).length,
      frameSize: allProducts.rows.filter(p => p.frame_size).length,
      actionType: allProducts.rows.filter(p => p.action_type).length,
      sightType: allProducts.rows.filter(p => p.sight_type).length,
      caliber: allProducts.rows.filter(p => p.caliber).length,
      capacity: allProducts.rows.filter(p => p.capacity).length,
    };
    
    console.log(`\n📈 Filter data statistics:  `);
    console.log(`   - Barrel Length: ${filterStats.barrelLength} products`);
    console.log(`   - Finish: ${filterStats.finish} products`);
    console.log(`   - Frame Size: ${filterStats.frameSize} products`);
    console.log(`   - Action Type: ${filterStats.actionType} products`);
    console.log(`   - Sight Type: ${filterStats.sightType} products`);
    console.log(`   - Caliber: ${filterStats.caliber} products`);
    console.log(`   - Capacity: ${filterStats.capacity} products`);
    
    // Show sample filter data from each department
    console.log('\n📋 Sample filter data by department:');
    Object.keys(departmentCounts).forEach(dept => {
      const deptProducts = allProducts.rows.filter(p => p.department_number === dept);
      const sample = deptProducts.slice(0, 3);
      
      console.log(`\nDept ${dept} (${deptProducts.length} products):`);
      sample.forEach((product, i) => {
        const filters = [];
        if (product.barrel_length) filters.push(`Barrel: ${product.barrel_length}`);
        if (product.finish) filters.push(`Finish: ${product.finish}`);
        if (product.frame_size) filters.push(`Frame: ${product.frame_size}`);
        if (product.action_type) filters.push(`Action: ${product.action_type}`);
        if (product.sight_type) filters.push(`Sight: ${product.sight_type}`);
        if (product.caliber) filters.push(`Caliber: ${product.caliber}`);
        if (product.capacity) filters.push(`Capacity: ${product.capacity}`);
        
        console.log(`   ${i + 1}. ${product.sku}: ${filters.join(', ') || 'No filters'}`);
      });
    });
    
  } catch (error: any) {
    console.error('❌ Error during massive filter sync:', error);
    throw error;
  }
}

// Run the sync
massiveFilterSync().catch(console.error);