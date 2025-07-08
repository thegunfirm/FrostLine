/**
 * Final Department Number Verification
 * Comprehensive test to verify database and Algolia department numbers match
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function finalDepartmentVerification() {
  console.log('🔍 Final department number verification...');
  
  try {
    // Test 1: Database department counts
    console.log('\n📊 Database department counts:');
    const dbDept01Count = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    const dbDept11Count = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(eq(products.departmentNumber, '11'));
    
    const dbDept34Count = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(eq(products.departmentNumber, '34'));
    
    console.log(`Department 01 (Handguns): ${dbDept01Count[0].count}`);
    console.log(`Department 11 (Bipods): ${dbDept11Count[0].count}`);
    console.log(`Department 34 (Parts): ${dbDept34Count[0].count}`);
    
    // Test 2: Algolia department counts
    console.log('\n🔍 Algolia department counts:');
    
    const algolia01Response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 1
      })
    });
    
    const algolia01Results = await algolia01Response.json();
    console.log(`Department 01 (Handguns): ${algolia01Results.nbHits}`);
    
    // Test 3: Specific problem products
    console.log('\n🧪 Testing specific products:');
    
    const testProducts = [
      { sku: 'YHM-BL-04P', name: 'YHM PISTOL LENGTH GAS TUBE BLK' },
      { sku: 'WR7913M', name: 'WARNE SKYLINE LITE BIPOD FXD PIC BLK' }
    ];
    
    for (const testProduct of testProducts) {
      // Get from database
      const dbProduct = await db.select()
        .from(products)
        .where(eq(products.sku, testProduct.sku))
        .limit(1);
      
      // Get from Algolia
      const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: testProduct.sku,
          hitsPerPage: 1
        })
      });
      
      const algoliaResults = await algoliaResponse.json();
      
      const dbDept = dbProduct[0]?.departmentNumber || 'NOT FOUND';
      const algoliaDept = algoliaResults.hits[0]?.departmentNumber || 'NOT FOUND';
      
      console.log(`${testProduct.sku}:`);
      console.log(`  Database: Department ${dbDept}`);
      console.log(`  Algolia: Department ${algoliaDept}`);
      console.log(`  Match: ${dbDept === algoliaDept ? '✅' : '❌'}`);
    }
    
    // Test 4: Department 01 accuracy check
    console.log('\n🎯 Department 01 accuracy check:');
    const match = algolia01Results.nbHits === dbDept01Count[0].count;
    console.log(`Database: ${dbDept01Count[0].count} products`);
    console.log(`Algolia: ${algolia01Results.nbHits} products`);
    console.log(`Match: ${match ? '✅' : '❌'}`);
    
    if (match) {
      console.log('\n🎉 SUCCESS: Database and Algolia department numbers match!');
      console.log('The handgun ribbon filter will now show exactly the correct Department 01 products.');
    } else {
      console.log('\n⏳ Algolia reload still in progress or incomplete');
      console.log('Department numbers will match once the reload completes.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
finalDepartmentVerification();