/**
 * Check Algolia Index Settings and Configuration
 */

async function checkAlgoliaSettings() {
  console.log('🔍 Checking Algolia index settings...');
  
  try {
    // Get current index settings
    const settingsResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      }
    });
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✓ Current Algolia index settings:');
      console.log('  - attributesForFaceting:', settings.attributesForFaceting || 'None');
      console.log('  - searchableAttributes:', settings.searchableAttributes || 'None');
      console.log('  - attributesToRetrieve:', settings.attributesToRetrieve || 'None');
    } else {
      console.log(`❌ Failed to get index settings: ${settingsResponse.status}`);
    }
    
    // Test a simple search without filters
    console.log('\n🔍 Testing simple handgun search...');
    const simpleSearchResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/search`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Handguns',
        hitsPerPage: 5
      })
    });
    
    if (simpleSearchResponse.ok) {
      const simpleResult = await simpleSearchResponse.json();
      console.log(`✓ Simple handgun search works: ${simpleResult.nbHits} total handguns`);
      
      // Check if any hits have caliber data
      const hitsWithCaliber = simpleResult.hits.filter(hit => hit.caliber);
      console.log(`✓ Handguns with caliber data: ${hitsWithCaliber.length}`);
      
      if (hitsWithCaliber.length > 0) {
        console.log('  - Sample calibers:', hitsWithCaliber.slice(0, 3).map(hit => hit.caliber));
      }
    } else {
      console.log(`❌ Simple handgun search failed: ${simpleSearchResponse.status}`);
    }
    
    // Test facet search without quotes
    console.log('\n🔍 Testing facet search without quotes...');
    const facetSearchResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/search`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:Handguns',
        facets: ['caliber'],
        maxValuesPerFacet: 10,
        hitsPerPage: 0
      })
    });
    
    if (facetSearchResponse.ok) {
      const facetResult = await facetSearchResponse.json();
      console.log(`✓ Facet search works: ${facetResult.nbHits} total handguns`);
      console.log('  - Caliber facets:', facetResult.facets?.caliber || 'None');
    } else {
      console.log(`❌ Facet search failed: ${facetSearchResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAlgoliaSettings().catch(console.error);