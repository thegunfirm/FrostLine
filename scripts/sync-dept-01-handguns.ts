/**
 * Sync All Department 01 Handguns to Algolia
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function syncDept01Handguns() {
  console.log('🔫 Syncing all department 01 handguns to Algolia...');
  
  // Get all department 01 products
  const dept01Products = await db.select()
    .from(products)
    .where(eq(products.departmentNumber, '01'));
  
  console.log(`📊 Found ${dept01Products.length} department 01 handgun products`);
  
  if (dept01Products.length === 0) {
    console.log('❌ No department 01 products found in database');
    return;
  }
  
  // Show first few products for verification
  console.log('\nFirst 5 department 01 products:');
  dept01Products.slice(0, 5).forEach((product, i) => {
    console.log(`${i + 1}. ${product.sku} - ${product.name} (${product.category})`);
  });
  
  const batchSize = 500;
  const batches = [];
  
  for (let i = 0; i < dept01Products.length; i += batchSize) {
    batches.push(dept01Products.slice(i, i + batchSize));
  }
  
  console.log(`\n📦 Processing ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
    
    // Convert to Algolia format
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku,
      title: product.name,
      name: product.name,
      category: product.category,
      categoryName: product.category,
      departmentNumber: product.departmentNumber,
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
      description: product.description || '',
      createdAt: product.createdAt?.toISOString(),
      updatedAt: product.updatedAt?.toISOString()
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
      console.error(`❌ Batch ${i + 1} failed: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText}`);
      throw new Error(`Algolia sync failed: ${response.status} ${response.statusText}`);
    }
    
    console.log(`✅ Batch ${i + 1} synced successfully`);
  }
  
  console.log(`✅ Successfully synced ${dept01Products.length} department 01 handgun products`);
  
  // Test the results
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
  console.log(`🧪 Final test - Department 01 in Algolia: ${testResult.nbHits} products`);
  
  if (testResult.nbHits === dept01Products.length) {
    console.log('🎉 Perfect! All department 01 handguns are now in Algolia');
  } else {
    console.log(`⚠️  Mismatch: Expected ${dept01Products.length}, got ${testResult.nbHits}`);
  }
}

syncDept01Handguns().catch(console.error);