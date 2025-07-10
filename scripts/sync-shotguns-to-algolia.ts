/**
 * Sync Shotgun Products to Algolia
 * Applies 5% Gold member discount for shotguns since RSR doesn't provide MAP pricing differentiation
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { sql } from "drizzle-orm";

async function syncShotgunsToAlgolia() {
  try {
    console.log("🔫 Starting Shotgun sync to Algolia...");
    
    // Get all shotgun products from category "Shotguns"
    const shotgunProducts = await db.select()
      .from(products)
      .where(sql`category = 'Shotguns'`);
    
    console.log(`📊 Found ${shotgunProducts.length} shotgun products to sync`);
    
    // Check how many have identical Bronze/Gold pricing
    const identicalPricing = shotgunProducts.filter(p => 
      p.priceBronze === p.priceGold && p.priceBronze > 0
    ).length;
    
    console.log(`💰 ${identicalPricing} shotguns have identical Bronze/Gold pricing - applying 5% Gold discount`);
    
    const algoliaObjects = shotgunProducts.map(product => {
      // For shotguns, if Bronze equals Gold, apply 5% Gold discount for member savings
      let goldPrice = product.priceGold || 0;
      const bronzePrice = product.priceBronze || 0;
      
      // If Gold price equals Bronze price, apply 5% discount for Gold members
      if (goldPrice === bronzePrice && bronzePrice > 0) {
        goldPrice = Math.round((bronzePrice * 0.95) * 100) / 100; // 5% discount, rounded to cents
      }
      
      return {
        objectID: product.sku,
        categoryName: product.category,
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        departmentNumber: product.departmentNumber,
        tierPricing: {
          bronze: bronzePrice,
          gold: goldPrice,
          platinum: product.pricePlatinum || 0
        },
        inventory: {
          onHand: product.stockQuantity || 0,
          allocated: false
        },
        inStock: (product.stockQuantity || 0) > 0,
        distributor: "RSR",
        tags: []
      };
    });
    
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
        console.log(`✅ Synced ${syncedCount}/${algoliaObjects.length} shotgun products`);
      } else {
        console.error(`❌ Batch sync failed:`, await response.text());
        break;
      }
    }
    
    console.log(`🎯 Successfully synced ${syncedCount} shotgun products to Algolia`);
    console.log("✅ Shotgun filtering should now work with Gold member discounts");
    
    // Show pricing examples for shotguns with 5% discount
    const discountExamples = algoliaObjects.filter(product => 
      product.tierPricing.bronze !== product.tierPricing.gold
    ).slice(0, 5);
    
    if (discountExamples.length > 0) {
      console.log("\n💰 Shotgun pricing examples (5% Gold discount applied):");
      discountExamples.forEach(product => {
        console.log(`  ${product.name}: Bronze $${product.tierPricing.bronze} → Gold $${product.tierPricing.gold} (${((1 - product.tierPricing.gold / product.tierPricing.bronze) * 100).toFixed(1)}% savings)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Shotgun sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncShotgunsToAlgolia()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { syncShotgunsToAlgolia };