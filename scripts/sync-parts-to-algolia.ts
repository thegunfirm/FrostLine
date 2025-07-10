/**
 * Sync Parts Products to Algolia
 * Ensures parts department (34) is properly indexed
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { sql } from "drizzle-orm";

async function syncPartsToAlgolia() {
  try {
    console.log("🔧 Starting Parts sync to Algolia...");
    
    // Get all parts products from department 34
    const partsProducts = await db.select()
      .from(products)
      .where(sql`department_number = '34'`);
    
    console.log(`📊 Found ${partsProducts.length} parts products to sync`);
    
    const algoliaObjects = partsProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      departmentNumber: product.departmentNumber,
      tierPricing: {
        bronze: product.priceBronze || 0,
        gold: product.priceGold || 0,
        platinum: product.pricePlatinum || 0
      },
      priceBronze: product.priceBronze || 0,
      priceGold: product.priceGold || 0,
      pricePlatinum: product.pricePlatinum || 0,
      price_bronze: product.priceBronze || 0,
      price_gold: product.priceGold || 0,
      price_platinum: product.pricePlatinum || 0,
      inStock: (product.stockQuantity || 0) > 0,
      stockQuantity: product.stockQuantity || 0,
      retailPrice: product.priceBronze || 0,
      distributor: "RSR"
    }));
    
    // Batch sync to Algolia
    const batchSize = 100;
    let syncedCount = 0;
    
    for (let i = 0; i < algoliaObjects.length; i += batchSize) {
      const batch = algoliaObjects.slice(i, i + batchSize);
      
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batch.map(obj => ({
            action: 'updateObject',
            body: obj
          }))
        })
      });
      
      if (response.ok) {
        syncedCount += batch.length;
        console.log(`✅ Synced ${syncedCount}/${algoliaObjects.length} parts products`);
      } else {
        console.error(`❌ Batch sync failed:`, await response.text());
        break;
      }
    }
    
    console.log(`🎯 Successfully synced ${syncedCount} parts products to Algolia`);
    console.log("✅ Parts filtering should now work for department 34");
    
  } catch (error) {
    console.error('❌ Parts sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncPartsToAlgolia()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { syncPartsToAlgolia };