/**
 * Fix Department Assignments - Use Only Authentic RSR Data
 * Corrects Algolia to match the authentic department numbers from database
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { isNotNull } from "drizzle-orm";

async function fixDepartmentAssignments() {
  console.log('🔧 Fixing department assignments with authentic RSR data...');
  
  // Get all products that have authentic department numbers from RSR
  const allProducts = await db.select()
    .from(products)
    .where(isNotNull(products.departmentNumber));
  
  console.log(`📊 Found ${allProducts.length} products with authentic department numbers`);
  
  // Group by department for verification
  const deptCounts: Record<string, number> = {};
  allProducts.forEach(product => {
    deptCounts[product.departmentNumber!] = (deptCounts[product.departmentNumber!] || 0) + 1;
  });
  
  console.log('Department distribution from database:');
  Object.entries(deptCounts).forEach(([dept, count]) => {
    console.log(`- Department ${dept}: ${count} products`);
  });
  
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < allProducts.length; i += batchSize) {
    batches.push(allProducts.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
    
    // Update with authentic department numbers only
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku,
      departmentNumber: product.departmentNumber, // Use authentic RSR department number
      categoryName: product.category,
      category: product.category,
      title: product.name
    }));
    
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: algoliaUpdates.map(obj => ({
          action: 'partialUpdateObject',
          body: obj,
          objectID: obj.objectID
        }))
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Batch ${i + 1} failed: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Algolia sync failed: ${response.status} ${response.statusText}`);
    }
    
    console.log(`✅ Batch ${i + 1} synced successfully`);
  }
  
  console.log(`✅ Successfully updated ${allProducts.length} products with authentic department numbers`);
  
  // Test the corrected department filtering
  const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: '',
      filters: 'departmentNumber:"01"',
      hitsPerPage: 0
    })
  });
  
  const testResult = await testResponse.json();
  console.log(`🧪 Department 01 now has ${testResult.nbHits} products (should be ~1,339)`);
}

fixDepartmentAssignments().catch(console.error);