/**
 * Verify and Repair Action Types in Algolia
 * Diagnose and fix the action type sync issue
 */

import { Pool } from 'pg';

async function verifyAndRepairActionTypes() {
  console.log('🔍 Verifying action type sync status...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // 1. Check database state
    const dbCheck = await client.query(`
      SELECT action_type, COUNT(*) as count
      FROM products 
      WHERE department_number = '01' 
        AND action_type IS NOT NULL 
        AND action_type != ''
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Database action types:');
    dbCheck.rows.forEach(row => {
      console.log(`  ${row.action_type}: ${row.count} products`);
    });
    
    // 2. Check Algolia with different filter syntax
    console.log('\n🔍 Testing Algolia filter syntax...');
    
    // Test with EXISTS filter
    const existsTest = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const existsResult = await existsTest.json();
    console.log('📊 Algolia handgun facets:', existsResult.facets?.actionType || 'None found');
    console.log('📊 Total handgun products:', existsResult.nbHits);
    
    // 3. Test specific products
    console.log('\n🎯 Testing specific products...');
    
    const specificProducts = await client.query(`
      SELECT id, name, action_type, sku
      FROM products 
      WHERE department_number = '01' 
        AND action_type = 'Striker Fired'
      LIMIT 5
    `);
    
    console.log(`\n📋 Database shows ${specificProducts.rows.length} Striker Fired products:`);
    specificProducts.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name} (${row.action_type})`);
    });
    
    // Check if these products exist in Algolia
    for (const product of specificProducts.rows) {
      const algoliaCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${product.id}`, {
        method: 'GET',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        }
      });
      
      if (algoliaCheck.ok) {
        const algoliaProduct = await algoliaCheck.json();
        console.log(`  ✓ ${product.id} in Algolia: actionType = ${algoliaProduct.actionType || 'MISSING'}`);
      } else {
        console.log(`  ❌ ${product.id} NOT FOUND in Algolia`);
      }
    }
    
    // 4. Try manual repair for these specific products
    console.log('\n🔧 Attempting manual repair for sample products...');
    
    const repairBatch = specificProducts.rows.map(product => ({
      action: 'partialUpdateObject',
      body: {
        objectID: product.id.toString(),
        actionType: product.action_type
      }
    }));
    
    const repairResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: repairBatch
      })
    });
    
    if (repairResponse.ok) {
      console.log('✅ Manual repair batch sent successfully');
      
      // Wait and test
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const retestFacets = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
      
      const retestResult = await retestFacets.json();
      console.log('\n📊 After repair - Algolia facets:', retestResult.facets?.actionType || 'Still none');
      
    } else {
      console.log('❌ Manual repair batch failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyAndRepairActionTypes().catch(console.error);