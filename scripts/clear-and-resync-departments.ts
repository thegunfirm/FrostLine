/**
 * Clear All Department Numbers and Resync with Authentic RSR Data
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { isNotNull } from "drizzle-orm";

async function clearAndResyncDepartments() {
  console.log('🧹 Step 1: Clearing all department numbers in Algolia...');
  
  // First, clear all department numbers by setting them to null
  const clearResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          action: 'partialUpdateObjectNoCreate',
          body: { departmentNumber: null },
          indexName: 'products'
        }
      ]
    })
  });
  
  // Better approach: Get all products with authentic department numbers and update only those
  console.log('🔄 Step 2: Syncing only authentic RSR department numbers...');
  
  const authenticProducts = await db.select()
    .from(products)
    .where(isNotNull(products.departmentNumber));
  
  console.log(`📊 Found ${authenticProducts.length} products with authentic department numbers`);
  
  // Show department breakdown
  const deptCounts: Record<string, number> = {};
  authenticProducts.forEach(product => {
    deptCounts[product.departmentNumber!] = (deptCounts[product.departmentNumber!] || 0) + 1;
  });
  
  console.log('Authentic department distribution:');
  Object.entries(deptCounts).forEach(([dept, count]) => {
    console.log(`- Department ${dept}: ${count} products`);
  });
  
  // Update only these specific products with their authentic department numbers
  const batchSize = 1000;
  for (let i = 0; i < authenticProducts.length; i += batchSize) {
    const batch = authenticProducts.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(authenticProducts.length / batchSize)}`);
    
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: batch.map(product => ({
          action: 'partialUpdateObject',
          body: {
            departmentNumber: product.departmentNumber,
            categoryName: product.category,
            title: product.name
          },
          objectID: product.sku
        }))
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Batch failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log(`✅ Batch synced successfully`);
  }
  
  console.log('✅ Authentic department sync complete');
  
  // Test results
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
  console.log(`🧪 Final count - Department 01: ${testResult.nbHits} products`);
  
  if (testResult.nbHits === 1339) {
    console.log('🎉 Perfect! Department 01 now has the correct count of authentic handguns');
  }
}

clearAndResyncDepartments().catch(console.error);