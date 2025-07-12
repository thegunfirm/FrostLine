/**
 * Test Search Functionality - Diagnose search issues without making changes
 */

import axios from 'axios';

async function testSearchFunctionality() {
  try {
    console.log('🔍 Testing Algolia search functionality...');
    
    // Test 1: Browse API (should work)
    const browseResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
      { hitsPerPage: 3 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Browse API: ${browseResponse.data.nbHits} total products`);
    console.log(`   Sample product: ${browseResponse.data.hits[0]?.name || 'N/A'}`);
    
    // Test 2: Search API - empty query (should return products)
    const searchResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      { query: '', hitsPerPage: 3 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🔍 Search API (empty query): ${searchResponse.data.nbHits} results`);
    
    // Test 3: Search API - text query
    const textSearchResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      { query: 'zenith', hitsPerPage: 3 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🔍 Search API (text query): ${textSearchResponse.data.nbHits} results`);
    
    // Test 4: Check index settings
    const settingsResponse = await axios.get(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/settings`,
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`⚙️ Index settings check:`);
    console.log(`   Searchable attributes: ${settingsResponse.data.searchableAttributes?.length || 0}`);
    console.log(`   Faceting attributes: ${settingsResponse.data.attributesForFaceting?.length || 0}`);
    console.log(`   Retrievable attributes: ${settingsResponse.data.attributesToRetrieve?.length || 0}`);
    
    // Test 5: Sample product structure
    if (browseResponse.data.hits.length > 0) {
      const sample = browseResponse.data.hits[0];
      console.log(`\n📊 Sample product structure:`);
      console.log(`   ID: ${sample.objectID}`);
      console.log(`   Name: ${sample.name}`);
      console.log(`   Department: ${sample.departmentNumber}`);
      console.log(`   Has searchable fields: ${sample.name ? 'YES' : 'NO'}`);
    }
    
    // Test 6: Filter test with browse API
    const browseFilterResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
      { 
        hitsPerPage: 3,
        filters: 'departmentNumber:01'
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🔍 Browse API with filter: ${browseFilterResponse.data.nbHits} results`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSearchFunctionality();