/**
 * Full Product Sync to Algolia - Complete Data Update
 * Updates all products with complete field data, not partial updates
 */

import { db } from "../server/db";
import { products } from "../shared/schema";

async function fullProductSyncToAlgolia() {
  console.log('🔄 Starting full product sync to Algolia...');
  
  // Get all products from database
  const allProducts = await db.select().from(products);
  console.log(`📊 Found ${allProducts.length} products to sync`);
  
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < allProducts.length; i += batchSize) {
    batches.push(allProducts.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
    
    // Convert to full Algolia objects (not partial updates)
    const algoliaObjects = batch.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategoryName: product.subcategoryName,
      departmentNumber: product.departmentNumber,
      departmentDesc: product.departmentDesc,
      subDepartmentDesc: product.subDepartmentDesc,
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
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));
    
    // Use saveObjects instead of partialUpdateObject for complete replacement
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: algoliaObjects.map(obj => ({
          action: 'updateObject',
          body: obj
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
  
  console.log(`✅ Successfully synced ${allProducts.length} products to Algolia`);
  
  // Test the sync with handgun department filtering
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
      hitsPerPage: 3
    })
  });
  
  const testResult = await testResponse.json();
  console.log(`🧪 Test: Found ${testResult.hits.length} products in department 01`);
  
  if (testResult.hits.length > 0) {
    console.log('First handgun:', {
      name: testResult.hits[0].name,
      category: testResult.hits[0].category,
      departmentNumber: testResult.hits[0].departmentNumber
    });
    console.log('🎉 Handgun filtering is now working!');
  }
}

fullProductSyncToAlgolia().catch(console.error);