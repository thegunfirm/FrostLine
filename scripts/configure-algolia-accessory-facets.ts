/**
 * Configure Algolia Accessory Facets
 * Sets up Algolia index settings to enable accessory filtering
 */

if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_API_KEY) {
  console.error('❌ Missing Algolia credentials');
  process.exit(1);
}

async function configureAccessoryFacets() {
  try {
    console.log('📋 Configuring Algolia accessory facets...');
    
    // Get current settings
    const getResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/rsr_products/settings`, {
      method: 'GET',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      }
    });
    
    const currentSettings = await getResponse.json();
    console.log('Current facets:', currentSettings.attributesForFaceting);
    
    // Add accessory filters to facets
    const newFacets = [
      ...(currentSettings.attributesForFaceting || []),
      'accessoryType',
      'compatibility',
      'material',
      'mountType'
    ];
    
    // Remove duplicates
    const uniqueFacets = Array.from(new Set(newFacets));
    
    // Update index settings
    const settingsResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/rsr_products/settings`, {
      method: 'PUT',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attributesForFaceting: uniqueFacets,
        searchableAttributes: [
          'name',
          'description',
          'manufacturerName',
          'stockNumber',
          'upc',
          'mpn',
          'tags',
          'accessoryType',
          'compatibility',
          'material',
          'mountType'
        ]
      })
    });
    
    const settingsResult = await settingsResponse.json();
    
    console.log('✅ Accessory facets configured successfully');
    console.log('📊 Facets:', uniqueFacets);
    console.log('🔄 Settings response:', settingsResult);
    
  } catch (error) {
    console.error('❌ Error configuring accessory facets:', error);
    process.exit(1);
  }
}

// Run the script
configureAccessoryFacets().then(() => {
  console.log('🎯 Accessory facet configuration complete');
  process.exit(0);
});