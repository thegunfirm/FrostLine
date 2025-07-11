/**
 * Sync All Filter Data to Algolia
 * Updates all products with extracted filter data to Algolia search index
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
    
    // Get all products with filter data
    const productsWithFilters = await db.execute(sql`
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
      AND (
        barrel_length IS NOT NULL OR 
        finish IS NOT NULL OR 
        frame_size IS NOT NULL OR 
        action_type IS NOT NULL OR 
        sight_type IS NOT NULL
      )
      ORDER BY department_number, sku
    `);
    
    console.log(`📊 Found ${productsWithFilters.rows.length} products with filter data to sync`);
    
    if (productsWithFilters.rows.length === 0) {
      console.log('⚠️  No products with filter data found');
      return;
    }
    
    // Show breakdown by department
    const departmentCounts = {};
    productsWithFilters.rows.forEach(product => {
      const dept = product.department_number || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    console.log('\n📋 Products by department:');
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`   - Dept ${dept}: ${count} products`);
    });
    
    // Process in batches to avoid overwhelming Algolia
    const batchSize = 100;
    let processed = 0;
    
    for (let i = 0; i < productsWithFilters.rows.length; i += batchSize) {
      const batch = productsWithFilters.rows.slice(i, i + batchSize);
      
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
        dropShippable: product.drop_shippable !== false
      }));
      
      // Send batch update to Algolia
      await client.partialUpdateObjects({
        indexName: 'products',
        objects: updates
      });
      
      processed += batch.length;
      
      console.log(`   ✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsWithFilters.rows.length / batchSize)} (${processed}/${productsWithFilters.rows.length} products)`);
      
      // Small delay to be respectful to Algolia API
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n🎉 Successfully synced ${processed} products with filter data to Algolia!`);
    
    // Show some sample data
    const sampleProducts = productsWithFilters.rows.slice(0, 10);
    console.log('\n📋 Sample filter data synced:');
    sampleProducts.forEach((product, i) => {
      const filters = [];
      if (product.barrel_length) filters.push(`Barrel: ${product.barrel_length}`);
      if (product.finish) filters.push(`Finish: ${product.finish}`);
      if (product.frame_size) filters.push(`Frame: ${product.frame_size}`);
      if (product.action_type) filters.push(`Action: ${product.action_type}`);
      if (product.sight_type) filters.push(`Sight: ${product.sight_type}`);
      
      console.log(`   ${i + 1}. ${product.sku} (Dept ${product.department_number}): ${filters.join(', ')}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error during comprehensive filter sync:', error);
    throw error;
  }
}

// Run the sync
syncAllFiltersToAlgolia().catch(console.error);