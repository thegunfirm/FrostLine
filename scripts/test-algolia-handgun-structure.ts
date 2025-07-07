/**
 * Test Algolia Handgun Structure
 * Quick test to see what fields are actually in the Algolia index
 */

import { algoliasearch } from 'algoliasearch';

// Initialize Algolia client
const appId = process.env.ALGOLIA_APP_ID || '';
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || '';

if (!appId || !adminApiKey) {
  console.error('❌ Algolia credentials missing');
  process.exit(1);
}

const client = algoliasearch(appId, adminApiKey);
const indexName = 'products';

async function testAlgoliaStructure() {
  console.log('🔍 TESTING ALGOLIA HANDGUN STRUCTURE...\n');

  try {
    // Test 1: Search for a specific handgun by name
    console.log('1. Testing specific handgun search...');
    const glockResult = await client.search({
      indexName,
      searchParams: {
        query: 'GLOCK 19',
        hitsPerPage: 3
      }
    });
    
    console.log(`Found ${glockResult.nbHits} results for "GLOCK 19"`);
    if (glockResult.hits.length > 0) {
      const firstHit = glockResult.hits[0];
      console.log('\nFirst result structure:');
      console.log(`- objectID: ${firstHit.objectID}`);
      console.log(`- name: ${firstHit.name}`);
      console.log(`- category: ${firstHit.category}`);
      console.log(`- categoryName: ${firstHit.categoryName}`);
      console.log(`- isCompleteFirearm: ${firstHit.isCompleteFirearm}`);
      console.log(`- All keys: ${Object.keys(firstHit).join(', ')}`);
    }
    
    // Test 2: Search specifically in Handguns category
    console.log('\n2. Testing Handguns category filter...');
    const handgunCategoryResult = await client.search({
      indexName,
      searchParams: {
        query: '',
        filters: 'categoryName:"Handguns"',
        hitsPerPage: 5
      }
    });
    
    console.log(`Found ${handgunCategoryResult.nbHits} results in Handguns category`);
    if (handgunCategoryResult.hits.length > 0) {
      console.log('\nFirst 3 handgun results:');
      handgunCategoryResult.hits.slice(0, 3).forEach((hit, i) => {
        const icon = hit.isCompleteFirearm === 1 ? '🔫' : '🔧';
        console.log(`${i + 1}. ${icon} ${hit.name} (category: ${hit.categoryName})`);
      });
    }
    
    // Test 3: Search all products to see what categories exist
    console.log('\n3. Testing all available categories...');
    const allCategoriesResult = await client.search({
      indexName,
      searchParams: {
        query: '',
        facets: ['categoryName'],
        hitsPerPage: 0
      }
    });
    
    if (allCategoriesResult.facets && allCategoriesResult.facets.categoryName) {
      console.log('\nAvailable categories in Algolia:');
      Object.entries(allCategoriesResult.facets.categoryName)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([category, count]) => {
          console.log(`  - ${category}: ${count} products`);
        });
    }
    
    console.log('\n✅ STRUCTURE TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Error testing Algolia structure:', error);
    throw error;
  }
}

// Run the test
testAlgoliaStructure().catch(console.error);