/**
 * Diagnose Algolia Facet Issue
 * Deep dive into why facet counts aren't updating despite successful product syncs
 */

import { Pool } from 'pg';

async function diagnoseAlgoliaFacetIssue() {
  console.log('🔍 Diagnosing Algolia facet count issue...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // 1. Get database counts for comparison
    const dbCounts = await client.query(`
      SELECT action_type, COUNT(*) as count
      FROM products 
      WHERE department_number = '01' 
        AND action_type IS NOT NULL 
        AND action_type != ''
      GROUP BY action_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Database Action Type Counts:');
    const dbActionTypes = {};
    dbCounts.rows.forEach(row => {
      dbActionTypes[row.action_type] = parseInt(row.count);
      console.log(`  ${row.action_type}: ${row.count}`);
    });
    
    // 2. Test different Algolia query approaches
    console.log('\n🔍 Testing Algolia query approaches...');
    
    // Approach 1: Basic facet query
    const basicQuery = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const basicResult = await basicQuery.json();
    console.log('📊 Basic Query Facets:', basicResult.facets?.actionType || 'None');
    
    // Approach 2: Browse API to get accurate count
    const browseQuery = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/browse`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: 'departmentNumber:"01"',
        attributesToRetrieve: ['actionType'],
        hitsPerPage: 1000
      })
    });
    
    const browseResult = await browseQuery.json();
    console.log(`📊 Browse API returned ${browseResult.hits?.length || 0} handgun products`);
    
    // Count action types from browse results
    const browseActionTypes = {};
    if (browseResult.hits) {
      browseResult.hits.forEach(hit => {
        if (hit.actionType) {
          browseActionTypes[hit.actionType] = (browseActionTypes[hit.actionType] || 0) + 1;
        }
      });
    }
    
    console.log('\n📊 Browse API Action Type Counts:');
    Object.entries(browseActionTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // 3. Check if there's a maxFacetHits limitation
    const maxFacetQuery = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
        facets: ['actionType'],
        maxFacetHits: 2000
      })
    });
    
    const maxFacetResult = await maxFacetQuery.json();
    console.log('\n📊 Max Facet Hits Query:', maxFacetResult.facets?.actionType || 'None');
    
    // 4. Test specific action type filter
    const strikerQuery = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01" AND actionType:"Striker Fired"',
        hitsPerPage: 0
      })
    });
    
    const strikerResult = await strikerQuery.json();
    console.log(`\n🎯 Direct "Striker Fired" query: ${strikerResult.nbHits} results`);
    
    // 5. Check index settings
    const settingsQuery = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
      method: 'GET',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      }
    });
    
    const settings = await settingsQuery.json();
    console.log('\n⚙️  Index Settings:');
    console.log(`  Max Facet Hits: ${settings.maxFacetHits || 'Default (100)'}`);
    console.log(`  Facet Attributes: ${settings.attributesForFaceting?.includes('actionType') ? 'actionType included' : 'actionType NOT included'}`);
    
    // 6. Summary comparison
    console.log('\n📊 COMPARISON SUMMARY:');
    console.log('Database vs Algolia Facets:');
    
    const algoliaTotals = Object.values(basicResult.facets?.actionType || {}).reduce((sum: number, count: number) => sum + count, 0);
    const dbTotals = Object.values(dbActionTypes).reduce((sum: number, count: number) => sum + count, 0);
    const browseTotals = Object.values(browseActionTypes).reduce((sum: number, count: number) => sum + count, 0);
    
    console.log(`  Database total: ${dbTotals}`);
    console.log(`  Algolia facets total: ${algoliaTotals}`);
    console.log(`  Browse API total: ${browseTotals}`);
    
    console.log('\nAction Type Breakdown:');
    const allTypes = new Set([...Object.keys(dbActionTypes), ...Object.keys(basicResult.facets?.actionType || {}), ...Object.keys(browseActionTypes)]);
    
    allTypes.forEach(type => {
      const db = dbActionTypes[type] || 0;
      const facet = basicResult.facets?.actionType?.[type] || 0;
      const browse = browseActionTypes[type] || 0;
      console.log(`  ${type}: DB=${db}, Facet=${facet}, Browse=${browse}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnosis
diagnoseAlgoliaFacetIssue().catch(console.error);