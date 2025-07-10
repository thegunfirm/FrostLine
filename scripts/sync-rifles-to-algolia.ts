/**
 * Sync Rifle Products to Algolia
 * Applies 5% Gold member discount for rifles that have identical Bronze/Gold pricing
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { sql } from "drizzle-orm";

async function syncRiflesToAlgolia() {
  try {
    console.log("🔫 Starting Rifle sync to Algolia...");
    
    // Get all rifle products from category "Rifles"
    const rifleProducts = await db.select()
      .from(products)
      .where(sql`category = 'Rifles'`);
    
    console.log(`📊 Found ${rifleProducts.length} rifle products to sync`);
    
    // Check how many have identical Bronze/Gold pricing
    const identicalPricing = rifleProducts.filter(p => 
      p.priceBronze === p.priceGold && p.priceBronze > 0
    ).length;
    
    console.log(`💰 ${identicalPricing} rifles have identical Bronze/Gold pricing - applying 5% Gold discount`);
    console.log(`💰 ${rifleProducts.length - identicalPricing} rifles already have different MAP pricing from RSR`);
    
    const algoliaObjects = rifleProducts.map(product => {
      // For rifles, if Bronze equals Gold, apply 5% Gold discount for member savings
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
        console.log(`✅ Synced ${syncedCount}/${algoliaObjects.length} rifle products`);
      } else {
        console.error(`❌ Batch sync failed:`, await response.text());
        break;
      }
    }
    
    console.log(`🎯 Successfully synced ${syncedCount} rifle products to Algolia`);
    console.log("✅ Rifle filtering should now work with proper MAP pricing + Gold member discounts where needed");
    
    // Show examples of both authentic MAP pricing and 5% discounts
    const authMapExamples = algoliaObjects.filter(product => 
      product.tierPricing.bronze !== product.tierPricing.gold &&
      // This wasn't a 5% discount (authentic MAP from RSR)
      product.tierPricing.gold !== Math.round((product.tierPricing.bronze * 0.95) * 100) / 100
    ).slice(0, 3);
    
    const discountExamples = algoliaObjects.filter(product => 
      product.tierPricing.gold === Math.round((product.tierPricing.bronze * 0.95) * 100) / 100
    ).slice(0, 3);
    
    if (authMapExamples.length > 0) {
      console.log("\n💰 Rifles with authentic RSR MAP pricing:");
      authMapExamples.forEach(product => {
        const savings = ((1 - product.tierPricing.gold / product.tierPricing.bronze) * 100).toFixed(1);
        console.log(`  ${product.name}: Bronze $${product.tierPricing.bronze} → Gold $${product.tierPricing.gold} (${savings}% RSR MAP savings)`);
      });
    }
    
    if (discountExamples.length > 0) {
      console.log("\n💰 Rifles with 5% Gold member discount applied:");
      discountExamples.forEach(product => {
        console.log(`  ${product.name}: Bronze $${product.tierPricing.bronze} → Gold $${product.tierPricing.gold} (5.0% member discount)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Rifle sync error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncRiflesToAlgolia()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { syncRiflesToAlgolia };