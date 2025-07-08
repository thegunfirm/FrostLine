/**
 * Test Algolia Direct - Debug what's actually in the index
 */

async function testAlgoliaDirect() {
  // Test with a specific product ID that we know exists
  const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'GLOCK',
      hitsPerPage: 3
    })
  });
  
  const result = await testResponse.json();
  console.log('🔍 Glock search results:', result.hits.length);
  
  if (result.hits.length > 0) {
    console.log('First result:', {
      id: result.hits[0].objectID,
      name: result.hits[0].name,
      category: result.hits[0].category,
      departmentNumber: result.hits[0].departmentNumber
    });
  }
}

testAlgoliaDirect().catch(console.error);