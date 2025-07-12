/**
 * Analyze Rifle Action Types
 * Careful analysis of current rifle action type coverage and patterns
 */

import { Pool } from 'pg';

async function analyzeRifleActionTypes() {
  console.log('🔍 Analyzing rifle action type coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // 1. Get total rifle count
    const totalRifles = await client.query(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    console.log(`📊 Total rifles in database: ${totalRifles.rows[0].total}`);
    
    // 2. Check current action type coverage
    const currentActionTypes = await client.query(`
      SELECT action_type, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND action_type IS NOT NULL 
        AND action_type != ''
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Current rifle action type distribution:');
    let totalWithActionTypes = 0;
    currentActionTypes.rows.forEach(row => {
      totalWithActionTypes += parseInt(row.count);
      console.log(`  ${row.action_type}: ${row.count} products`);
    });
    
    const coveragePercent = (totalWithActionTypes / parseInt(totalRifles.rows[0].total) * 100).toFixed(2);
    console.log(`\n📈 Current coverage: ${totalWithActionTypes}/${totalRifles.rows[0].total} (${coveragePercent}%)`);
    
    // 3. Sample rifle names for pattern analysis
    const sampleRifles = await client.query(`
      SELECT name, action_type, sku
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
      ORDER BY RANDOM()
      LIMIT 20
    `);
    
    console.log('\n🎯 Sample rifle names for pattern analysis:');
    sampleRifles.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name} (${row.action_type || 'NO ACTION TYPE'})`);
    });
    
    // 4. Look for common rifle action patterns
    const actionPatterns = await client.query(`
      SELECT name, sku
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          name ILIKE '%bolt%' OR 
          name ILIKE '%lever%' OR 
          name ILIKE '%semi%' OR
          name ILIKE '%pump%' OR
          name ILIKE '%break%' OR
          name ILIKE '%single%shot%' OR
          name ILIKE '%auto%' OR
          name ILIKE '%straight%pull%'
        )
      ORDER BY name
      LIMIT 30
    `);
    
    console.log('\n🔍 Rifles with potential action type patterns:');
    actionPatterns.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name}`);
    });
    
    // 5. Check Algolia current state
    const algoliaCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
        hitsPerPage: 0,
        facets: ['actionType']
      })
    });
    
    const algoliaResult = await algoliaCheck.json();
    console.log('\n📊 Current Algolia rifle action type facets:');
    if (algoliaResult.facets && algoliaResult.facets.actionType) {
      const algoliaTotalWithActionTypes = Object.values(algoliaResult.facets.actionType).reduce((sum: number, count: number) => sum + count, 0);
      console.log(`Total rifles with action types in Algolia: ${algoliaTotalWithActionTypes}`);
      
      Object.entries(algoliaResult.facets.actionType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log('  No action type facets found in Algolia');
    }
    
    console.log(`\nTotal rifles in Algolia: ${algoliaResult.nbHits}`);
    
    // 6. Identify specific improvement opportunities
    console.log('\n🎯 Improvement opportunities:');
    
    const potentialBolt = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (action_type IS NULL OR action_type = '')
        AND name ILIKE '%bolt%'
    `);
    
    const potentialLever = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (action_type IS NULL OR action_type = '')
        AND name ILIKE '%lever%'
    `);
    
    const potentialSemi = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (action_type IS NULL OR action_type = '')
        AND (name ILIKE '%semi%' OR name ILIKE '%auto%')
    `);
    
    console.log(`  Potential bolt action rifles: ${potentialBolt.rows[0].count}`);
    console.log(`  Potential lever action rifles: ${potentialLever.rows[0].count}`);
    console.log(`  Potential semi-automatic rifles: ${potentialSemi.rows[0].count}`);
    
    // 7. Summary
    console.log('\n📋 ANALYSIS SUMMARY:');
    console.log(`  Current rifle action type coverage: ${coveragePercent}%`);
    console.log(`  Products with action types: ${totalWithActionTypes}`);
    console.log(`  Products without action types: ${parseInt(totalRifles.rows[0].total) - totalWithActionTypes}`);
    console.log(`  Improvement potential: ${potentialBolt.rows[0].count + potentialLever.rows[0].count + potentialSemi.rows[0].count} products`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeRifleActionTypes().catch(console.error);