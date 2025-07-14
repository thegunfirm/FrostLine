/**
 * Configure Algolia Handgun Ranking
 * Sets up Algolia index to automatically prioritize handguns in $400-$800 range
 */

async function configureAlgoliaHandgunRanking() {
  console.log('🔧 Configuring Algolia index for handgun priority ranking...');
  
  try {
    // Update index settings to include isPriorityPriceRange in ranking
    const settings = {
      // Custom ranking attributes - higher priority items rank higher
      customRanking: [
        'desc(isPriorityPriceRange)', // Priority price range first
        'desc(inStock)',              // In stock items next
        'asc(name)'                   // Then alphabetical
      ],
      
      // Ensure isPriorityPriceRange is searchable and filterable
      searchableAttributes: [
        'unordered(name)',
        'unordered(description)',
        'unordered(manufacturerName)',
        'unordered(categoryName)',
        'unordered(caliber)',
        'unordered(tags)'
      ],
      
      attributesForFaceting: [
        'searchable(manufacturerName)',
        'searchable(categoryName)',
        'searchable(departmentNumber)',
        'searchable(caliber)',
        'searchable(actionType)',
        'searchable(finish)',
        'searchable(frameSize)',
        'searchable(barrelLength)',
        'searchable(sightType)',
        'searchable(capacity)',
        'searchable(inStock)',
        'searchable(newItem)',
        'searchable(dropShippable)',
        'searchable(isPriorityPriceRange)', // Add for faceting
        'filterOnly(tierPricing.bronze)',
        'filterOnly(tierPricing.gold)',
        'filterOnly(tierPricing.platinum)'
      ],
      
      // Ranking formula tweaks
      ranking: [
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'  // This will use our customRanking
      ]
    };
    
    console.log('📝 Updating index settings...');
    
    // Use direct HTTP API call to update settings
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
      method: 'PUT',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Algolia settings update failed:', errorText);
      process.exit(1);
    }
    
    console.log('✅ Algolia index configured for handgun priority ranking');
    console.log('📊 Priority ranking order:');
    console.log('   1. isPriorityPriceRange (desc) - $400-$800 handguns first');
    console.log('   2. inStock (desc) - In stock items first');
    console.log('   3. name (asc) - Alphabetical order');
    
  } catch (error) {
    console.error('❌ Error configuring Algolia ranking:', error);
    process.exit(1);
  }
}

// Run the configuration
configureAlgoliaHandgunRanking();