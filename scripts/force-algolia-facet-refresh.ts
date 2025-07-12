/**
 * Force Algolia Facet Refresh
 * Force refresh of action type facets to reflect the updated data
 */

import { Pool } from 'pg';

async function forceAlgoliaFacetRefresh() {
  console.log('🔄 Forcing Algolia facet refresh for action types...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handgun products with action types
    const products = await client.query(`
      SELECT id, action_type, name
      FROM products 
      WHERE department_number = '01' 
        AND action_type IS NOT NULL 
        AND action_type != ''
      ORDER BY action_type, id
    `);
    
    console.log(`📊 Found ${products.rows.length} handgun products with action types`);
    
    // Group by action type to see what we should expect
    const actionTypeGroups = {};
    products.rows.forEach(p => {
      actionTypeGroups[p.action_type] = (actionTypeGroups[p.action_type] || 0) + 1;
    });
    
    console.log('\n📋 Expected action type distribution:');
    Object.entries(actionTypeGroups).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} products`);
    });
    
    // Force update all products with explicit action type data
    // Using smaller batches to ensure reliability
    const batchSize = 25;
    let synced = 0;
    
    console.log('\n🔄 Starting forced sync with explicit action type data...');
    
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
                actionType: product.action_type,
                // Force update timestamp to ensure indexing
                _lastUpdated: new Date().toISOString()
              }
            }))
          })
        });
        
        if (response.ok) {
          synced += batch.length;
          
          if (synced % 100 === 0) {
            console.log(`✅ Synced ${synced}/${products.rows.length} products`);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Batch failed: ${errorText}`);
        }
      } catch (error) {
        console.error(`❌ Batch error:`, error);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Forced sync complete: ${synced}/${products.rows.length} products`);
    
    // Wait longer for indexing
    console.log('\n⏱️  Waiting 15 seconds for complete indexing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Final verification
    const finalCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 0,
        facets: ['actionType']
      })
    });
    
    const finalResult = await finalCheck.json();
    console.log('\n📊 Final action type facets:');
    
    if (finalResult.facets && finalResult.facets.actionType) {
      const totalFacetCount = Object.values(finalResult.facets.actionType).reduce((sum: number, count: number) => sum + count, 0);
      console.log(`Total products with action types: ${totalFacetCount}`);
      
      Object.entries(finalResult.facets.actionType).forEach(([type, count]) => {
        const expected = actionTypeGroups[type] || 0;
        const status = count === expected ? '✅' : '⚠️';
        console.log(`  ${status} ${type}: ${count} (expected: ${expected})`);
      });
    } else {
      console.log('❌ No action type facets found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the forced refresh
forceAlgoliaFacetRefresh().catch(console.error);