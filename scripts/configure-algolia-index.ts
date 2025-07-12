/**
 * Configure Algolia Index Settings
 * Properly configure the Algolia index for searching and faceting
 */

import axios from 'axios';

async function configureAlgoliaIndex() {
  try {
    console.log('🔧 Configuring Algolia index settings...');
    
    const settings = {
      searchableAttributes: [
        'name',
        'description',
        'manufacturerName',
        'stockNumber',
        'categoryName',
        'caliber',
        'unordered(mpn)',
        'unordered(upc)'
      ],
      attributesForFaceting: [
        'filterOnly(categoryName)',
        'filterOnly(manufacturerName)',
        'filterOnly(departmentNumber)',
        'filterOnly(inStock)',
        'filterOnly(dropShippable)',
        'filterOnly(newItem)',
        'filterOnly(internalSpecial)',
        'filterOnly(caliber)',
        'filterOnly(capacity)',
        'filterOnly(barrelLength)',
        'filterOnly(finish)',
        'filterOnly(frameSize)',
        'filterOnly(actionType)',
        'filterOnly(sightType)',
        'tierPricing.bronze',
        'tierPricing.gold',
        'tierPricing.platinum'
      ],
      ranking: [
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
        'desc(newItem)',
        'asc(tierPricing.platinum)'
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      hitsPerPage: 24,
      maxValuesPerFacet: 100,
      distinct: true,
      attributeForDistinct: 'stockNumber',
      exactOnSingleWordQuery: 'attribute',
      disableExactOnAttributes: ['description'],
      advancedSyntax: true,
      queryLanguages: ['en'],
      removeWordsIfNoResults: 'lastWords'
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
    console.log('⏳ Settings are being applied...');
    
    // Wait a few seconds for settings to propagate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Testing search functionality...');
    
    // Test search
    const testResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      {
        query: 'glock',
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

    console.log(`🎯 Test search results: ${testResponse.data.nbHits} hits for "glock"`);
    
    if (testResponse.data.nbHits > 0) {
      console.log('✅ Search is working correctly!');
    } else {
      console.log('⚠️ Search is not returning results - may need data re-indexing');
    }

  } catch (error) {
    console.error('❌ Error configuring Algolia index:', error);
    throw error;
  }
}

configureAlgoliaIndex();