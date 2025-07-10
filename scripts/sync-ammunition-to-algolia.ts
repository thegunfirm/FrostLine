/**
 * Sync Ammunition Products to Algolia
 * Ensures ammunition department (18) is properly indexed with corrected pricing
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { sql } from "drizzle-orm";

async function syncAmmunitionToAlgolia() {
  try {
    console.log("💥 Starting Ammunition sync to Algolia...");
    
    // Get all ammunition products from department 18
    const ammunitionProducts = await db.select()
      .from(products)
      .where(sql`department_number = '18'`);
    
    console.log(`📊 Found ${ammunitionProducts.length} ammunition products to sync`);
    console.log("Ammunition breakdown:");
    console.log(`  Rifle Ammunition: ${ammunitionProducts.filter(p => p.category === "Rifle Ammunition").length}`);
    console.log(`  Handgun Ammunition: ${ammunitionProducts.filter(p => p.category === "Handgun Ammunition").length}`);
    console.log(`  Shotgun Ammunition: ${ammunitionProducts.filter(p => p.category === "Shotgun Ammunition").length}`);
    console.log(`  Rimfire Ammunition: ${ammunitionProducts.filter(p => p.category === "Rimfire Ammunition").length}`);
    console.log(`  General Ammunition: ${ammunitionProducts.filter(p => p.category === "Ammunition").length}`);
    
    const algoliaObjects = ammunitionProducts.map(product => {
      // For ammunition, if Bronze equals Gold, apply 5% Gold discount for member savings
      let goldPrice = product.priceGold || 0;
      const bronzePrice = product.priceBronze || 0;
      
      // If Gold price equals Bronze price, apply 5% discount for Gold members
      if (goldPrice === bronzePrice && bronzePrice > 0) {
        goldPrice = Math.round((bronzePrice * 0.95) * 100) / 100; // 5% discount, rounded to cents
      }
      
      return {
        objectID: product.sku,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        categoryName: product.category,
        departmentNumber: product.departmentNumber,
        tierPricing: {
          bronze: bronzePrice,
          gold: goldPrice,
          platinum: product.pricePlatinum || 0
        },
        priceBronze: bronzePrice,
        priceGold: goldPrice,
        pricePlatinum: product.pricePlatinum || 0,
        price_bronze: bronzePrice,
        price_gold: goldPrice,
        price_platinum: product.pricePlatinum || 0,
        inStock: (product.stockQuantity || 0) > 0,
        stockQuantity: product.stockQuantity || 0,
        retailPrice: bronzePrice,
        distributor: "RSR"
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
        console.log(`✅ Synced ${syncedCount}/${algoliaObjects.length} ammunition products`);
      } else {
        console.error(`❌ Batch sync failed:`, await response.text());
        break;
      }
    }
    
    console.log(`🎯 Successfully synced ${syncedCount} ammunition products to Algolia`);
    console.log("✅ Ammunition filtering should now work with Gold member discounts for department 18");
    
    // Show pricing examples
    const examples = algoliaObjects.slice(0, 5);
    console.log("\n💰 Pricing examples:");
    examples.forEach(product => {
      if (product.tierPricing.bronze !== product.tierPricing.gold) {
        console.log(`  ${product.name}: Bronze $${product.tierPricing.bronze} → Gold $${product.tierPricing.gold} (${((1 - product.tierPricing.gold / product.tierPricing.bronze) * 100).toFixed(1)}% savings)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Ammunition sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAmmunitionToAlgolia()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { syncAmmunitionToAlgolia };