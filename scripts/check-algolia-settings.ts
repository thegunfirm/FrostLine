/**
 * Check Algolia Index Settings and Configuration
 */

async function checkAlgoliaSettings() {
  console.log('🔍 Checking Algolia index settings...');
  
  // Get index settings
  const settingsResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/settings`, {
    method: 'GET',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
    }
  });
  
  const settings = await settingsResponse.json();
  console.log('🔧 Index settings:');
  console.log('- Searchable attributes:', settings.searchableAttributes);
  console.log('- Attributes for faceting:', settings.attributesForFaceting);
  console.log('- Unretrievable attributes:', settings.unretrievableAttributes);
  
  // Get a sample record to see actual field structure
  const sampleResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      hitsPerPage: 1
    })
  });
  
  const sampleResult = await sampleResponse.json();
  if (sampleResult.hits.length > 0) {
    console.log('\n📄 Sample record structure:');
    console.log('Object keys:', Object.keys(sampleResult.hits[0]));
    console.log('Department Number:', sampleResult.hits[0].departmentNumber);
    console.log('Category:', sampleResult.hits[0].category);
    console.log('Name:', sampleResult.hits[0].name);
  }
  
  // Test if departmentNumber is configured for filtering
  if (settings.attributesForFaceting) {
    const hasDeptNum = settings.attributesForFaceting.some((attr: string) => 
      attr.includes('departmentNumber') || attr.includes('department')
    );
    console.log('\n🔍 Department filtering configured:', hasDeptNum);
    
    if (!hasDeptNum) {
      console.log('❌ departmentNumber not in attributesForFaceting - this is the issue!');
      console.log('Need to add departmentNumber to faceting attributes');
    }
  }
}

checkAlgoliaSettings().catch(console.error);