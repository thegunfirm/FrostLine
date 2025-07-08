/**
 * Configure Algolia Index for Department Filtering
 */

async function configureAlgoliaForDepartments() {
  console.log('🔧 Configuring Algolia index for department filtering...');
  
  // Update index settings to include departmentNumber for filtering
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/settings`, {
    method: 'PUT',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      attributesForFaceting: [
        'filterOnly(categoryName)',
        'filterOnly(manufacturer)', 
        'filterOnly(manufacturerName)',
        'filterOnly(inStock)',
        'filterOnly(tags)',
        'filterOnly(departmentNumber)', // Add department number for filtering
        'filterOnly(category)' // Add category field too
      ],
      searchableAttributes: [
        'title,description',
        'fullDescription', 
        'manufacturer',
        'manufacturerName',
        'sku',
        'categoryName',
        'category',
        'tags'
      ]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update settings: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  console.log('✅ Index settings updated - departmentNumber now configured for filtering');
  
  // Wait a moment for settings to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test department filtering
  const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"01"',
      hitsPerPage: 3
    })
  });
  
  const testResult = await testResponse.json();
  console.log(`🧪 Department filter test: ${testResult.hits.length} results`);
  
  if (testResult.hits.length > 0) {
    console.log('🎉 Department filtering is now configured and working!');
  } else {
    console.log('⚠️  Department filtering configured but no results yet - need to sync department numbers');
  }
}

configureAlgoliaForDepartments().catch(console.error);