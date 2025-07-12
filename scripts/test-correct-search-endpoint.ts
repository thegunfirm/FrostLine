/**
 * Test Correct Search Endpoint - Find the right API path
 */

import axios from 'axios';

async function testCorrectSearchEndpoint() {
  try {
    console.log('🔍 Testing correct search API endpoint...');
    
    // Test the actual search endpoint that's working in the backend
    const searchResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`,
      { 
        query: '',
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
    
    console.log(`✅ Search API (query endpoint): ${searchResponse.data.nbHits} results`);
    console.log(`   Sample product: ${searchResponse.data.hits[0]?.name || 'N/A'}`);
    
    // Test with text search
    const textSearchResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`,
      { 
        query: 'zenith',
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
    
    console.log(`🔍 Text search for "zenith": ${textSearchResponse.data.nbHits} results`);
    
    // Test with department filter
    const deptFilterResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`,
      { 
        query: '',
        filters: 'departmentNumber:"01"',
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
    
    console.log(`🎯 Department 01 filter: ${deptFilterResponse.data.nbHits} results`);
    
    // Test with different department filter
    const deptFilter05Response = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`,
      { 
        query: '',
        filters: 'departmentNumber:"05"',
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
    
    console.log(`🎯 Department 05 filter: ${deptFilter05Response.data.nbHits} results`);
    
    // Show sample results
    if (deptFilterResponse.data.hits.length > 0) {
      console.log('\n📊 Sample dept 01 results:');
      deptFilterResponse.data.hits.forEach((hit, i) => {
        console.log(`   ${i+1}. ${hit.objectID} - ${hit.name}`);
      });
    }
    
    if (deptFilter05Response.data.hits.length > 0) {
      console.log('\n📊 Sample dept 05 results:');
      deptFilter05Response.data.hits.forEach((hit, i) => {
        console.log(`   ${i+1}. ${hit.objectID} - ${hit.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testCorrectSearchEndpoint();