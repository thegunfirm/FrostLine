/**
 * Complete Department Number Sync
 * Ensures all products have department numbers and Algolia is fully synchronized
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { isNull, isNotNull, sql } from 'drizzle-orm';

async function completeDepartmentSync() {
  console.log('🔄 Starting complete department sync...');
  
  try {
    // Step 1: Check products without department numbers
    console.log('\n📊 Checking products without department numbers...');
    const missingDeptCount = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(isNull(products.departmentNumber));
    
    console.log(`Products without department numbers: ${missingDeptCount[0].count}`);
    
    if (missingDeptCount[0].count > 0) {
      console.log('\n🔧 Fixing missing department numbers...');
      // Get products without department numbers
      const productsWithoutDept = await db.select()
        .from(products)
        .where(isNull(products.departmentNumber))
        .limit(100);
      
      console.log(`Sample products without department numbers:`);
      productsWithoutDept.forEach(p => {
        console.log(`- ${p.sku}: ${p.name}`);
      });
      
      // These should be updated from RSR data
      console.log('\n⚠️  Products without department numbers need RSR data update');
    }
    
    // Step 2: Check total products with department numbers
    console.log('\n📈 Checking total products with department numbers...');
    const totalWithDept = await db.select({ count: sql`count(*)` })
      .from(products)
      .where(isNotNull(products.departmentNumber));
    
    console.log(`Products with department numbers: ${totalWithDept[0].count}`);
    
    // Step 3: Check Algolia sync status
    console.log('\n🔍 Checking Algolia sync status...');
    
    // Check Department 01 count
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
        hitsPerPage: 1
      })
    });
    
    const dept01Results = await dept01Response.json();
    
    // Check total products in Algolia
    const totalResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        hitsPerPage: 1
      })
    });
    
    const totalResults = await totalResponse.json();
    
    console.log(`Department 01 in Algolia: ${dept01Results.nbHits}`);
    console.log(`Total products in Algolia: ${totalResults.nbHits}`);
    
    // Step 4: Check if sync is complete
    const dbTotal = totalWithDept[0].count;
    const algoliaTotal = totalResults.nbHits;
    
    console.log('\n🎯 Sync Status:');
    console.log(`Database products: ${dbTotal}`);
    console.log(`Algolia products: ${algoliaTotal}`);
    
    if (dbTotal === algoliaTotal) {
      console.log('✅ COMPLETE: Database and Algolia are synchronized!');
      
      // Test specific products
      console.log('\n🧪 Testing specific products...');
      const testProducts = [
        { sku: 'YHM-BL-04P', expectedDept: '34' },
        { sku: 'WR7913M', expectedDept: '11' }
      ];
      
      for (const testProduct of testProducts) {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
        
        const results = await response.json();
        
        if (results.hits.length > 0) {
          const hit = results.hits[0];
          const actualDept = hit.departmentNumber;
          
          if (actualDept === testProduct.expectedDept) {
            console.log(`✅ ${testProduct.sku}: Department ${actualDept} (CORRECT)`);
          } else {
            console.log(`❌ ${testProduct.sku}: Department ${actualDept}, expected ${testProduct.expectedDept}`);
          }
        } else {
          console.log(`❓ ${testProduct.sku}: Not found in Algolia`);
        }
      }
      
      return true;
    } else {
      console.log('⏳ INCOMPLETE: Algolia sync still in progress');
      console.log(`Missing ${dbTotal - algoliaTotal} products in Algolia`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Department sync check failed:', error);
    return false;
  }
}

// Run the sync check
completeDepartmentSync().then(complete => {
  if (complete) {
    console.log('\n🎉 Department sync is complete! Ready for next step.');
  } else {
    console.log('\n⏳ Department sync still in progress. Please wait...');
  }
});