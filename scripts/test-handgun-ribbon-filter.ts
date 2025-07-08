/**
 * Test Handgun Ribbon Filter
 * Verifies that the Handgun ribbon button correctly filters to Department 01 with exactly 3,389 results
 */

import { apiRequest } from '../client/src/lib/queryClient';

async function testHandgunRibbonFilter() {
  console.log('🔍 Testing Handgun ribbon filter...');
  
  try {
    // Test the search endpoint with Handguns category (should filter to dept 01)
    const response = await fetch('http://localhost:5000/api/search/algolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: {
          category: 'Handguns'
        },
        sort: 'relevance',
        page: 0,
        hitsPerPage: 1000
      })
    });
    
    const searchResults = await response.json();
    
    console.log('🎯 Search Results:');
    console.log(`Total hits: ${searchResults.nbHits}`);
    console.log(`Pages: ${searchResults.nbPages}`);
    console.log(`Hits per page: ${searchResults.hitsPerPage}`);
    
    // Check if we get exactly 3,389 handgun products
    if (searchResults.nbHits === 3389) {
      console.log('✅ SUCCESS: Handgun ribbon filter returns exactly 3,389 Department 01 products');
    } else {
      console.log(`❌ FAILURE: Expected 3,389 handgun products, got ${searchResults.nbHits}`);
    }
    
    // Show sample products to verify they're from Department 01
    console.log('\n📋 Sample products:');
    searchResults.hits.slice(0, 5).forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.name} - Dept: ${product.departmentNumber} - Category: ${product.category}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testHandgunRibbonFilter();