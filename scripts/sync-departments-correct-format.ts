/**
 * Sync Department Numbers with Correct Algolia Field Format
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function syncDepartmentsCorrectFormat() {
  console.log('🔄 Syncing department numbers with correct Algolia format...');
  
  // Get handgun products with department numbers
  const handgunProducts = await db.select()
    .from(products)
    .where(eq(products.category, 'Handguns'));
  
  console.log(`📊 Found ${handgunProducts.length} handgun products to update`);
  
  const batchSize = 1000;
  const batches = [];
  
  for (let i = 0; i < handgunProducts.length; i += batchSize) {
    batches.push(handgunProducts.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
    
    // Update with correct field mapping for existing Algolia structure
    const algoliaUpdates = batch.map(product => ({
      objectID: product.sku,
      departmentNumber: product.departmentNumber || "01", // Default handguns to 01
      categoryName: product.category, // Use categoryName field that exists in Algolia
      category: product.category, // Also update category field
      title: product.name, // Use title field that exists in Algolia
      manufacturerName: product.manufacturer,
      inStock: product.inStock,
      tags: product.tags
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
  
  console.log(`✅ Successfully synced ${handgunProducts.length} handgun products with correct format`);
}

syncDepartmentsCorrectFormat().catch(console.error);