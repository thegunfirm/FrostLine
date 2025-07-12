/**
 * Configure Algolia Index Settings
 * Properly configure the Algolia index for searching and faceting
 */

import axios from 'axios';

async function configureAlgoliaIndex() {
  try {
    console.log('⚙️ Configuring Algolia index settings...');
    
    const settings = {
      attributesForFaceting: [
        'departmentNumber',
        'categoryName',
        'manufacturerName',
        'caliber',
        'capacity',
        'tierPricing.platinum',
        'inStock',
        'barrelLength',
        'finish',
        'frameSize',
        'actionType',
        'sightType',
        'newItem',
        'internalSpecial',
        'dropShippable',
        'tags'
      ],
      searchableAttributes: [
        'name',
        'description',
        'manufacturerName',
        'stockNumber',
        'categoryName',
        'caliber',
        'mpn',
        'upc'
      ],
      ranking: [
        'desc(inStock)',
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'
      ],
      customRanking: [
        'desc(inStock)',
        'desc(inventoryQuantity)',
        'asc(price)'
      ],
      unretrievableAttributes: [],
      attributesToRetrieve: ['*'],
      highlightPreTag: '<em>',
      highlightPostTag: '</em>',
      snippetEllipsisText: '…',
      responseFields: ['*'],
      maxValuesPerFacet: 100,
      sortFacetValuesBy: 'count',
      attributesToHighlight: ['name', 'description', 'manufacturerName'],
      attributesToSnippet: ['description:50'],
      hitsPerPage: 24,
      paginationLimitedTo: 1000,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      typoTolerance: true,
      allowTyposOnNumericTokens: false,
      disableTypoToleranceOnAttributes: [],
      ignorePlurals: true,
      removeStopWords: true,
      queryLanguages: ['en'],
      enableRules: true,
      enablePersonalization: false,
      numericAttributesForFiltering: [
        'tierPricing.bronze',
        'tierPricing.gold', 
        'tierPricing.platinum',
        'inventoryQuantity',
        'weight',
        'capacity'
      ],
      separatorsToIndex: '',
      replaceSynonymsInHighlight: true,
      minProximity: 1,
      disableExactOnAttributes: [],
      exactOnSingleWordQuery: 'attribute',
      alternativesAsExact: ['ignorePlurals', 'singleWordSynonym'],
      advancedSyntax: true,
      optionalWords: [],
      disablePrefixOnAttributes: [],
      removeWordsIfNoResults: 'lastWords',
      decompoundQuery: true,
      advancedSyntaxFeatures: ['exactPhrase', 'excludeWords']
    };
    
    const response = await axios.put(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/settings`,
      settings,
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Algolia index settings configured successfully');
    console.log('📊 Settings applied:', JSON.stringify(settings, null, 2));
    
    // Wait for settings to be applied
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test search with department filter
    console.log('\n🔍 Testing search functionality...');
    
    const testCategories = [
      { name: 'Handguns', dept: '01' },
      { name: 'Long Guns', dept: '05' },
      { name: 'Ammunition', dept: '18' },
      { name: 'Optics', dept: '08' }
    ];
    
    for (const category of testCategories) {
      try {
        const testResponse = await axios.post(
          `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
          {
            query: '',
            filters: `departmentNumber:"${category.dept}"`,
            hitsPerPage: 5
          },
          {
            headers: {
              'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
              'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ ${category.name} (${category.dept}): ${testResponse.data.nbHits} results`);
        
        if (testResponse.data.hits.length > 0) {
          console.log(`   Sample: ${testResponse.data.hits[0].name}`);
        }
        
      } catch (error) {
        console.log(`❌ ${category.name} search failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

configureAlgoliaIndex();