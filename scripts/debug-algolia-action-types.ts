/**
 * Debug Algolia Action Types
 * Check if action type data is properly indexed in Algolia
 */

async function debugAlgoliaActionTypes() {
  console.log('🔍 Debugging Algolia action type data...');
  
  try {
    // Test 1: Get a few random handgun products and check their action types
    const randomCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 5,
        attributesToRetrieve: ['objectID', 'name', 'actionType']
      })
    });
    
    const randomResults = await randomCheck.json();
    console.log('\n📋 Random handgun products:');
    console.log('Response:', JSON.stringify(randomResults, null, 2));
    
    if (randomResults.hits && randomResults.hits.length > 0) {
      randomResults.hits.forEach((hit: any, i: number) => {
        console.log(`  ${i+1}. ${hit.name} (${hit.objectID})`);
        console.log(`     Action Type: ${hit.actionType || 'MISSING'}`);
      });
    } else {
      console.log('No hits returned from Algolia search');
    }
    
    // Test 2: Direct facet search for action types
    const facetCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const facetResults = await facetCheck.json();
    console.log('\n📊 Current Algolia action type facets:');
    console.log(JSON.stringify(facetResults.facets?.actionType || 'No facets', null, 2));
    
    // Test 3: Check if products with specific action types exist
    const strikerCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01" AND actionType:"Striker Fired"',
        hitsPerPage: 3,
        attributesToRetrieve: ['objectID', 'name', 'actionType']
      })
    });
    
    const strikerResults = await strikerCheck.json();
    console.log('\n🎯 Striker Fired products:');
    console.log(`Found ${strikerResults.nbHits} products with Striker Fired action type`);
    if (strikerResults.hits && strikerResults.hits.length > 0) {
      strikerResults.hits.forEach((hit: any, i: number) => {
        console.log(`  ${i+1}. ${hit.name} (${hit.actionType})`);
      });
    } else {
      console.log('No Striker Fired products found');
    }
    
    // Test 4: Check index stats
    const statsCheck = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products`, {
      method: 'GET',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      }
    });
    
    const stats = await statsCheck.json();
    console.log('\n📈 Index statistics:');
    console.log(`  Total products: ${stats.nbRecords}`);
    console.log(`  Last update: ${stats.updatedAt}`);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugAlgoliaActionTypes().catch(console.error);