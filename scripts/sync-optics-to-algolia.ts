/**
 * Sync Optics Products to Algolia
 * Ensures optics departments (08, 09, 30, 31) are properly indexed
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { sql } from "drizzle-orm";

async function syncOpticsToAlgolia() {
  try {
    console.log("🔍 Starting Optics sync to Algolia...");
    
    // Get all optics products from departments 08, 09, 30, 31
    const opticsProducts = await db.select()
      .from(products)
      .where(sql`department_number IN ('08', '09', '30', '31')`);
    
    console.log(`📊 Found ${opticsProducts.length} optics products to sync`);
    console.log("Department breakdown:");
    console.log(`  Dept 08 (Optics): ${opticsProducts.filter(p => p.departmentNumber === "08").length}`);
    console.log(`  Dept 09 (Optical Accessories): ${opticsProducts.filter(p => p.departmentNumber === "09").length}`);
    console.log(`  Dept 30 (Sights): ${opticsProducts.filter(p => p.departmentNumber === "30").length}`);
    console.log(`  Dept 31 (Optical Accessories): ${opticsProducts.filter(p => p.departmentNumber === "31").length}`);
    
    const algoliaObjects = opticsProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      departmentNumber: product.departmentNumber,
      tierPricing: {
        bronze: product.retailPrice || 0,
        gold: product.mapPrice || product.retailPrice || 0,
        platinum: product.dealerPrice || product.retailPrice || 0
      },
      inStock: (product.stockQuantity || 0) > 0,
      stockQuantity: product.stockQuantity || 0,
      retailPrice: product.retailPrice || 0,
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
        console.log(`✅ Synced ${syncedCount}/${algoliaObjects.length} optics products`);
      } else {
        console.error(`❌ Batch sync failed:`, await response.text());
        break;
      }
    }
    
    console.log(`🎯 Successfully synced ${syncedCount} optics products to Algolia`);
    console.log("✅ Optics filtering should now work for all departments (08, 09, 30, 31)");
    
  } catch (error) {
    console.error('❌ Optics sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncOpticsToAlgolia()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { syncOpticsToAlgolia };