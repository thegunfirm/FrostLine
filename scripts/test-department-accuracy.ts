/**
 * Test Department Number Accuracy
 * Verify specific products have correct department numbers in Algolia
 */

async function testDepartmentAccuracy() {
  console.log('🧪 Testing department number accuracy...');
  
  // Test specific products that were showing incorrect departments
  const testProducts = [
    { sku: 'YHM-BL-04P', expectedDept: '34', name: 'YHM PISTOL LENGTH GAS TUBE BLK' },
    { sku: 'WR7913M', expectedDept: '11', name: 'WARNE SKYLINE LITE BIPOD FXD PIC BLK' }
  ];
  
  for (const product of testProducts) {
    try {
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: product.sku,
          hitsPerPage: 1
        })
      });
      
      const results = await response.json();
      
      if (results.hits.length > 0) {
        const hit = results.hits[0];
        const actualDept = hit.departmentNumber;
        
        if (actualDept === product.expectedDept) {
          console.log(`✅ ${product.sku}: Department ${actualDept} (CORRECT)`);
        } else {
          console.log(`❌ ${product.sku}: Department ${actualDept}, expected ${product.expectedDept} (INCORRECT)`);
        }
      } else {
        console.log(`❓ ${product.sku}: Not found in Algolia`);
      }
    } catch (error) {
      console.error(`Error testing ${product.sku}:`, error);
    }
  }
  
  // Test Department 01 count
  try {
    const dept01Response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const dept01Results = await dept01Response.json();
    console.log(`📊 Department 01 products in Algolia: ${dept01Results.nbHits}`);
    
    // Show sample Department 01 products
    console.log('\n📋 Sample Department 01 products:');
    dept01Results.hits.forEach((product: any, index: number) => {
      console.log(`${index + 1}. ${product.name} - Dept: ${product.departmentNumber}`);
    });
    
  } catch (error) {
    console.error('Error testing Department 01:', error);
  }
}

// Run the test
testDepartmentAccuracy();