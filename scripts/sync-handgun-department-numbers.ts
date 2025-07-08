/**
 * Sync Handgun Department Numbers to Algolia
 * Updates only handgun products in Algolia with department numbers
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function syncHandgunDepartmentNumbers() {
  console.log('🔄 Syncing handgun department numbers to Algolia...');
  
  // Get all handgun products with department numbers
  const handgunProducts = await db.select()
    .from(products)
    .where(eq(products.category, 'Handguns'));
  
  console.log(`📊 Found ${handgunProducts.length} handgun products`);
  
  const algoliaObjects = handgunProducts.map(product => ({
    objectID: product.sku, // Use SKU as objectID to match existing Algolia records
    departmentNumber: product.departmentNumber,
    name: product.name,
    category: product.category,
    manufacturer: product.manufacturer,
    manufacturerName: product.manufacturerName,
    sku: product.sku,
    inStock: product.inStock,
    quantity: product.quantity,
    retailPrice: product.retailPrice,
    dealerPrice: product.dealerPrice,
    msrp: product.msrp,
    retailMap: product.retailMap,
    tierPricing: product.tierPricing,
    requiresFFL: product.requiresFFL,
    tags: product.tags,
    imageUrl: product.imageUrl,
    description: product.description,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  }));
  
  // Update Algolia in batches of 1000
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < algoliaObjects.length; i += batchSize) {
    batches.push(algoliaObjects.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
    
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: batch.map(obj => ({
          action: 'partialUpdateObject',
          body: {
            departmentNumber: obj.departmentNumber
          },
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
  
  console.log(`✅ Successfully synced ${algoliaObjects.length} handgun products to Algolia`);
  
  // Test the sync
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
      hitsPerPage: 5
    })
  });
  
  const testResult = await testResponse.json();
  console.log(`🧪 Test search found ${testResult.hits.length} products in department 01`);
  
  if (testResult.hits.length > 0) {
    console.log('🎉 Handgun filtering is now working!');
  }
}

syncHandgunDepartmentNumbers().catch(console.error);