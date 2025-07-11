/**
 * Sync New Filter Data to Algolia
 * Updates all products with the new filter fields (barrel length, finish, frame size, action type, sight type)
 */

import { algoliasearch } from 'algoliasearch';
import { db } from '../server/db';
import { products } from '../shared/schema';
import { sql } from 'drizzle-orm';

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_API_KEY) {
  throw new Error('Missing Algolia credentials');
}

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);

async function syncFilterDataToAlgolia() {
  try {
    console.log('🔄 Starting filter data sync to Algolia...');
    
    // Get all products with filter data - limiting to handguns for now
    const productsWithFilters = await db.execute(sql`
      SELECT 
        id, 
        sku,
        barrel_length,
        finish,
        frame_size,
        action_type,
        sight_type,
        new_item,
        internal_special,
        drop_shippable
      FROM products 
      WHERE department_number = '01'
      AND (
        barrel_length IS NOT NULL OR 
        finish IS NOT NULL OR 
        frame_size IS NOT NULL OR 
        action_type IS NOT NULL OR 
        sight_type IS NOT NULL
      )
      LIMIT 1000
    `);
    
    console.log(`📊 Found ${productsWithFilters.rows.length} products with filter data`);
    
    if (productsWithFilters.rows.length === 0) {
      console.log('⚠️  No products with filter data found. Run extract-handgun-filters.ts first.');
      return;
    }
    
    // Update Algolia in batches
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < productsWithFilters.rows.length; i += batchSize) {
      const batch = productsWithFilters.rows.slice(i, i + batchSize);
      
      // Prepare batch update objects
      const updates = batch.map(product => ({
        objectID: product.sku,
        barrelLength: product.barrel_length,
        finish: product.finish,
        frameSize: product.frame_size,
        actionType: product.action_type,
        sightType: product.sight_type,
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
      
      console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}: ${updated}/${productsWithFilters.rows.length} products`);
      
      // Wait a bit between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Successfully synced ${updated} products with filter data to Algolia`);
    
    // Test the new facets
    console.log('\n🔍 Testing new facets...');
    
    const testResponse = await client.search({
      requests: [
        {
          indexName: 'products',
          params: {
            query: 'glock',
            facets: ['barrelLength', 'finish', 'frameSize', 'actionType', 'sightType'],
            maxFacetHits: 10
          }
        }
      ]
    });
    
    const facets = testResponse.results[0].facets;
    
    console.log('📈 New facet counts for "glock" search:');
    console.log('- Barrel lengths:', Object.keys(facets?.barrelLength || {}).length);
    console.log('- Finishes:', Object.keys(facets?.finish || {}).length);
    console.log('- Frame sizes:', Object.keys(facets?.frameSize || {}).length);
    console.log('- Action types:', Object.keys(facets?.actionType || {}).length);
    console.log('- Sight types:', Object.keys(facets?.sightType || {}).length);
    
    console.log('\n🎯 Filter data sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing filter data:', error);
    throw error;
  }
}

// Run the sync
syncFilterDataToAlgolia().catch(console.error);