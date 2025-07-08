/**
 * Analyze Department Mix in Algolia
 */

async function analyzeDepartmentMix() {
  // Get department 01 results and see what categories are mixed in
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"01"',
      hitsPerPage: 50,
      facets: ['categoryName', 'category']
    })
  });
  
  const result = await response.json();
  console.log(`Total department 01 products: ${result.nbHits}`);
  
  // Count categories in the results
  const categoryCount: Record<string, number> = {};
  result.hits.forEach((hit: any) => {
    const category = hit.categoryName || hit.category || 'undefined';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  console.log('\nCategory breakdown in department 01:');
  Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`- ${category}: ${count} products`);
    });
    
  // Check some sample products
  console.log('\nSample products from department 01:');
  result.hits.slice(0, 10).forEach((hit: any, i: number) => {
    console.log(`${i + 1}. ${hit.title || hit.name} (Category: ${hit.categoryName || hit.category})`);
  });
}

analyzeDepartmentMix().catch(console.error);