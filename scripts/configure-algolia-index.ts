/**
 * Configure Algolia Index Settings
 * Properly configure the Algolia index for searching and faceting
 */

import axios from 'axios';

async function configureAlgoliaIndex() {
  try {
    console.log('⚙️ Configuring Algolia index settings...');
    
    const settings = {
      // Searchable attributes in order of importance
      searchableAttributes: [
        'name',
        'manufacturerName',
        'description',
        'sku',
        'upc'
      ],
      
      // Attributes for faceting
      attributesForFaceting: [
        'filterOnly(departmentNumber)',
        'filterOnly(categoryName)',
        'searchable(manufacturerName)',
        'searchable(caliber)',
        'searchable(capacity)',
        'filterOnly(inStock)',
        'filterOnly(tierPricing.bronze)',
        'filterOnly(tierPricing.gold)',
        'filterOnly(tierPricing.platinum)',
        'filterOnly(barrelLength)',
        'filterOnly(finish)',
        'filterOnly(frameSize)',
        'filterOnly(actionType)',
        'filterOnly(sightType)',
        'filterOnly(newItem)',
        'filterOnly(internalSpecial)',
        'filterOnly(dropShippable)',
        'filterOnly(fflRequired)'
      ],
      
      // Attributes to highlight
      attributesToHighlight: [
        'name',
        'manufacturerName',
        'description'
      ],
      
      // Attributes to snippet
      attributesToSnippet: [
        'description:15'
      ],
      
      // Ranking criteria
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
      
      // Custom ranking - prioritize in-stock items
      customRanking: [
        'desc(inStock)',
        'asc(name)'
      ],
      
      // Typo tolerance
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      
      // Highlighting and snippeting
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      
      // Pagination
      hitsPerPage: 24,
      maxValuesPerFacet: 100,
      
      // Query rules
      enableRules: true,
      
      // Distinct
      distinct: false,
      
      // Advanced
      removeWordsIfNoResults: 'allOptional',
      advancedSyntax: true,
      optionalWords: [],
      
      // Synonyms
      synonyms: [],
      
      // Replacements
      replaceSynonymsInHighlight: true,
      
      // Numeric attributes for filtering
      numericAttributesForFiltering: [
        'tierPricing.bronze',
        'tierPricing.gold', 
        'tierPricing.platinum',
        'capacity',
        'weight'
      ]
    };
    
    // Apply settings
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
    console.log('⏱️ Settings will be applied in a few moments...');
    
    // Wait for settings to be applied
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test search after configuration
    const testResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      {
        query: 'glock',
        hitsPerPage: 3
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🎯 Test search for 'glock': ${testResponse.data.nbHits} results`);
    
    if (testResponse.data.nbHits > 0) {
      console.log('🎉 Search is working!');
      testResponse.data.hits.forEach((hit: any) => {
        console.log(`  ${hit.objectID} - ${hit.name} - ${hit.manufacturerName}`);
      });
    } else {
      console.log('⚠️ Search still returning 0 results');
    }
    
  } catch (error) {
    console.error('❌ Failed to configure Algolia index:', error);
    throw error;
  }
}

configureAlgoliaIndex();