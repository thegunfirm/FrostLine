/**
 * Sync Handgun Action Types to Algolia - Batch Approach
 * Focused sync for handgun action types only, preserving all other Algolia data
 */

import { Pool } from 'pg';

async function syncHandgunActionTypesBatch() {
  console.log('🎯 Starting focused handgun action type sync to Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handgun products with action types
    const products = await client.query(`
      SELECT id, action_type
      FROM products 
      WHERE department_number = '01' AND action_type IS NOT NULL AND action_type != ''
      ORDER BY action_type, id
    `);
    
    console.log(`📊 Found ${products.rows.length} handgun products with action types`);
    
    // Show breakdown by action type
    const actionTypeCounts = {};
    products.rows.forEach(p => {
      actionTypeCounts[p.action_type] = (actionTypeCounts[p.action_type] || 0) + 1;
    });
    
    console.log('\n📋 Action type breakdown:');
    Object.entries(actionTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} products`);
    });
    
    // Batch sync using Algolia batch API
    const batchSize = 100;
    let totalSynced = 0;
    
    for (let i = 0; i < products.rows.length; i += batchSize) {
      const batch = products.rows.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch.map(product => ({
              action: 'partialUpdateObject',
              body: {
                objectID: product.id.toString(),
                actionType: product.action_type
              }
            }))
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          totalSynced += batch.length;
          console.log(`✅ Batch ${Math.ceil((i + batchSize) / batchSize)}: ${totalSynced}/${products.rows.length} products synced`);
        } else {
          const error = await response.text();
          console.error(`❌ Batch ${i}-${i + batchSize} failed: ${response.status} - ${error}`);
        }
      } catch (error) {
        console.error(`❌ Batch ${i}-${i + batchSize} error:`, error);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Handgun action type sync complete!`);
    console.log(`📊 Total synced: ${totalSynced}/${products.rows.length} products`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the sync
syncHandgunActionTypesBatch().catch(console.error);