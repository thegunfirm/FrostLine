/**
 * Complete Handgun Action Type Sync
 * Ensures all 2,028 handgun products with action types are properly synced to Algolia
 */

import { Pool } from 'pg';

async function completeHandgunActionSync() {
  console.log('🎯 Starting complete handgun action type sync...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handgun products with action types from database
    const products = await client.query(`
      SELECT id, action_type, name, sku
      FROM products 
      WHERE department_number = '01' 
        AND action_type IS NOT NULL 
        AND action_type != ''
      ORDER BY id
    `);
    
    console.log(`📊 Database: ${products.rows.length} handgun products with action types`);
    
    // First, let's verify what's currently in Algolia
    const algoliaCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01" AND actionType:*',
        hitsPerPage: 0,
        facets: ['actionType']
      })
    });
    
    const algoliaData = await algoliaCheck.json();
    console.log(`📊 Algolia: ${algoliaData.nbHits} handgun products with action types`);
    
    // Now sync all products using more efficient approach
    const batchSize = 50; // Smaller batches for better reliability
    let totalSynced = 0;
    let successfulBatches = 0;
    let failedBatches = 0;
    
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
          successfulBatches++;
          
          if (successfulBatches % 10 === 0) {
            console.log(`✅ Progress: ${totalSynced}/${products.rows.length} products synced (${successfulBatches} successful batches)`);
          }
        } else {
          const error = await response.text();
          failedBatches++;
          console.error(`❌ Batch ${i}-${i + batchSize} failed: ${response.status} - ${error}`);
        }
      } catch (error) {
        failedBatches++;
        console.error(`❌ Batch ${i}-${i + batchSize} error:`, error);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n🎉 Complete sync finished!`);
    console.log(`📊 Total synced: ${totalSynced}/${products.rows.length} products`);
    console.log(`✅ Successful batches: ${successfulBatches}`);
    console.log(`❌ Failed batches: ${failedBatches}`);
    
    // Wait a moment for indexing, then verify
    console.log('\n⏱️  Waiting 10 seconds for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify final count
    const finalCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01" AND actionType:*',
        hitsPerPage: 0,
        facets: ['actionType']
      })
    });
    
    const finalData = await finalCheck.json();
    console.log(`\n📊 Final verification: ${finalData.nbHits} handgun products with action types in Algolia`);
    
    if (finalData.facets && finalData.facets.actionType) {
      console.log('\n🎯 Updated action type distribution:');
      Object.entries(finalData.facets.actionType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} products`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the complete sync
completeHandgunActionSync().catch(console.error);