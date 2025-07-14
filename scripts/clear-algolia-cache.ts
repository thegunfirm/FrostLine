/**
 * Clear Algolia Cache - Force Fresh Index Settings
 * Clears all cached data and resets index configuration
 */

import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);

// Use searchSingleIndex instead of initIndex for modern Algolia
const index = client.searchSingleIndex({
  indexName: 'products',
  searchParams: { query: '', hitsPerPage: 0 }
});

async function clearAlgoliaCache() {
  try {
    console.log('🧹 Clearing Algolia cache and resetting index settings...');
    
    // Clear all cached settings
    await index.clearSettings();
    
    // Reset index settings with fresh configuration
    await index.setSettings({
      searchableAttributes: [
        'name',
        'description',
        'manufacturerName',
        'categoryName',
        'stockNumber',
        'upc',
        'mpn',
        'tags'
      ],
      attributesForFaceting: [
        'filterOnly(departmentNumber)',
        'filterOnly(categoryName)',
        'filterOnly(manufacturerName)',
        'filterOnly(caliber)',
        'filterOnly(capacity)',
        'filterOnly(barrelLength)',
        'filterOnly(finish)',
        'filterOnly(frameSize)',
        'filterOnly(actionType)',
        'filterOnly(sightType)',
        'filterOnly(inStock)',
        'filterOnly(newItem)',
        'filterOnly(internalSpecial)',
        'filterOnly(dropShippable)',
        'filterOnly(tags)',
        'filterOnly(tierPricing.platinum)',
        'filterOnly(platformCategory)',
        'filterOnly(partTypeCategory)',
        'filterOnly(nfaItemType)',
        'filterOnly(nfaBarrelLength)',
        'filterOnly(nfaFinish)',
        'filterOnly(accessoryType)',
        'filterOnly(compatibility)',
        'filterOnly(material)',
        'filterOnly(mountType)',
        'filterOnly(receiverType)'
      ],
      customRanking: [
        'desc(inStock)',
        'desc(inventoryQuantity)',
        'asc(tierPricing.platinum)'
      ],
      ranking: [
        'words',
        'typo',
        'attribute',
        'proximity',
        'exact',
        'custom'
      ],
      typoTolerance: 'strict',
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      allowTyposOnNumericTokens: false,
      ignorePlurals: true,
      removeStopWords: true,
      queryLanguages: ['en'],
      decompoundQuery: true,
      enableRules: true,
      enablePersonalization: false,
      clickAnalytics: false,
      analytics: false,
      synonyms: true,
      replaceSynonymsInHighlight: false,
      minProximity: 1,
      responseFields: ['*'],
      maxFacetHits: 100,
      maxValuesPerFacet: 100,
      sortFacetValuesBy: 'count',
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      snippetEllipsisText: '…',
      restrictHighlightAndSnippetArrays: false
    });
    
    console.log('✅ Algolia cache cleared and settings reset');
    
    // Test search to verify cache is cleared
    const testResult = await index.search('', {
      hitsPerPage: 1,
      facets: ['categoryName', 'manufacturerName']
    });
    
    console.log('🔍 Test search results:');
    console.log(`Total hits: ${testResult.nbHits}`);
    console.log('Available facets:', Object.keys(testResult.facets || {}));
    
    console.log('🎯 Cache clearing completed successfully');
    
  } catch (error) {
    console.error('❌ Error clearing Algolia cache:', error);
    throw error;
  }
}

// Run the cache clearing
clearAlgoliaCache()
  .then(() => {
    console.log('✨ Algolia cache cleared successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cache clearing failed:', error);
    process.exit(1);
  });