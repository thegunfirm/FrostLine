/**
 * Sync Updated Action Types to Algolia
 * Updates Algolia index with improved action type data for handgun filtering
 */

import { Pool } from 'pg';
import { algoliasearch } from 'algoliasearch';

const algolia = algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_API_KEY!);
const index = algolia.initIndex('products');

async function syncActionTypes() {
  console.log('🔄 Syncing updated action type data to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handgun products with updated action types
    const result = await client.query(`
      SELECT id, name, action_type, department_number
      FROM products 
      WHERE department_number = '01' AND action_type IS NOT NULL AND action_type != ''
      ORDER BY action_type
    `);
    
    console.log(`📊 Found ${result.rows.length} handgun products with action types`);
    
    // Prepare batch updates for Algolia
    const updates = result.rows.map(product => ({
      objectID: product.id.toString(),
      actionType: product.action_type
    }));
    
    // Batch update Algolia in chunks of 100
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        await index.partialUpdateObjects(batch, {
          createIfNotExists: false
        });
        
        updated += batch.length;
        console.log(`✅ Updated ${updated}/${updates.length} products in Algolia`);
      } catch (error) {
        console.error(`❌ Error updating batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    console.log(`🎉 Successfully synced ${updated} action types to Algolia`);
    
    // Show final distribution
    const countResult = await client.query(`
      SELECT action_type, COUNT(*) as count
      FROM products 
      WHERE department_number = '01' AND action_type IS NOT NULL AND action_type != ''
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    console.log('\n📈 Action type distribution:');
    countResult.rows.forEach(row => {
      console.log(`- ${row.action_type}: ${row.count} products`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncActionTypes().catch(console.error);