/**
 * Test Handgun Department Filter - Direct Algolia Test
 */

async function testHandgunDepartmentFilter() {
  console.log('🧪 Testing handgun department filtering...');
  
  // Test 1: Search for products in department 01
  const dept01Response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"01"',
      hitsPerPage: 5
    })
  });
  
  const dept01Result = await dept01Response.json();
  console.log(`Department 01 results: ${dept01Result.hits.length}`);
  
  if (dept01Result.hits.length > 0) {
    console.log('First dept 01 product:', {
      name: dept01Result.hits[0].name,
      category: dept01Result.hits[0].category,
      departmentNumber: dept01Result.hits[0].departmentNumber
    });
  }
  
  // Test 2: Search for category Handguns
  const handgunsResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'category:"Handguns"',
      hitsPerPage: 5
    })
  });
  
  const handgunsResult = await handgunsResponse.json();
  console.log(`Category Handguns results: ${handgunsResult.hits.length}`);
  
  if (handgunsResult.hits.length > 0) {
    console.log('First handgun product:', {
      name: handgunsResult.hits[0].name,
      category: handgunsResult.hits[0].category,
      departmentNumber: handgunsResult.hits[0].departmentNumber
    });
  }
  
  // Test 3: Check a specific handgun SKU
  const specificResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'GL74008',
      hitsPerPage: 1
    })
  });
  
  const specificResult = await specificResponse.json();
  console.log(`Specific handgun SKU GL74008: ${specificResult.hits.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
  
  if (specificResult.hits.length > 0) {
    console.log('GL74008 data:', {
      name: specificResult.hits[0].name,
      category: specificResult.hits[0].category,
      departmentNumber: specificResult.hits[0].departmentNumber
    });
  }
}

testHandgunDepartmentFilter().catch(console.error);