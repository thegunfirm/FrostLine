/**
 * Configure Algolia Search Index Settings
 * Sets up proper searchable attributes and filtering for better search results
 */

// Configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function configureAlgoliaIndex() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    console.error('❌ Missing Algolia credentials');
    process.exit(1);
  }

  console.log('🔧 Configuring Algolia index settings...');

  try {
    // Configure index settings
    const settingsResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
      method: 'PUT',
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Define which attributes are searchable and their priority
        searchableAttributes: [
          'unordered(title)',                    // Product name - highest priority
          'unordered(name)',                     // Alternative name field
          'unordered(manufacturer)',             // Manufacturer name
          'unordered(manufacturerName)',         // Alternative manufacturer field
          'unordered(description)',              // Product description - CRITICAL for filtering
          'unordered(categoryName)',             // Category name
          'unordered(category)',                 // Alternative category field
          'unordered(sku)',                      // SKU/Stock number
          'unordered(tags)'                      // Tags array
        ],
        
        // Attributes that can be used for filtering/faceting
        attributesForFaceting: [
          'searchable(categoryName)',            // Enable category filtering and search
          'searchable(manufacturer)',            // Enable manufacturer filtering and search  
          'searchable(manufacturerName)',        // Alternative manufacturer field
          'inStock',                             // Stock status
          'requiresFFL',                         // FFL requirement
          'tags'                                 // Product tags
        ],

        // Ranking criteria (most important first)
        ranking: [
          'typo',                                // Typo tolerance
          'geo',                                 // Geographical relevance
          'words',                               // Number of matched words
          'filters',                             // Filters score
          'proximity',                           // Proximity of matched words
          'attribute',                           // Attribute ranking
          'exact',                               // Exact matches
          'custom'                               // Custom ranking
        ],

        // Custom ranking for business logic
        customRanking: [
          'desc(inStock)',                       // In-stock items first
          'asc(retailPrice)'                     // Lower prices first
        ],

        // Typo tolerance settings
        minWordSizefor1Typo: 4,               // Allow 1 typo for 4+ character words
        minWordSizefor2Typos: 8,              // Allow 2 typos for 8+ character words
        disableTypoToleranceOnWords: [],       // No disabled words
        disableTypoToleranceOnAttributes: [],  // No disabled attributes

        // Highlighting settings
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        
        // Snippet settings for description
        snippetEllipsisText: '...',
        attributesToSnippet: [
          'description:20'                       // Show 20-word snippets from description
        ],

        // Pagination
        hitsPerPage: 24,
        maxValuesPerFacet: 100,

        // Query strategy
        queryType: 'prefixLast',                 // Allow prefix matching on last word
        removeWordsIfNoResults: 'lastWords',     // Remove words if no results
        advancedSyntax: false,                   // Disable advanced query syntax
        
        // Exact matching
        exactOnSingleWordQuery: 'attribute',     // Exact match behavior for single words
        
        // Alternative corrections
        alternativesAsExact: ['ignorePlurals', 'singleWordSynonym']
      })
    });

    if (!settingsResponse.ok) {
      const errorText = await settingsResponse.text();
      throw new Error(`Settings update failed: ${errorText}`);
    }

    console.log('✅ Algolia index settings configured successfully');
    console.log('📋 Key settings applied:');
    console.log('   • Description field enabled for search');
    console.log('   • Category and manufacturer filtering enabled');
    console.log('   • Proper ranking with in-stock items prioritized');
    console.log('   • Typo tolerance optimized for product searches');

  } catch (error) {
    console.error('❌ Failed to configure Algolia index:', error);
    process.exit(1);
  }
}

// Run the configuration
configureAlgoliaIndex();