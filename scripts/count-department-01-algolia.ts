/**
 * Count Department 01 Products in Algolia
 */

async function countDepartment01Algolia() {
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
      hitsPerPage: 0, // Just get count
      attributesToRetrieve: []
    })
  });
  
  const result = await response.json();
  console.log(`Department 01 products in Algolia: ${result.nbHits}`);
}

countDepartment01Algolia().catch(console.error);