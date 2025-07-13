/**
 * Batch Gold Pricing Fix
 * Efficiently fixes Gold pricing discounts in batches and syncs to Algolia
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";
import { algoliasearch } from "algoliasearch";

// Algolia configuration
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);
const index = client.initIndex('products');

interface ProductUpdate {
  id: number;
  sku: string;
  oldGoldPrice: number;
  newGoldPrice: number;
  department: string;
}

async function batchGoldPricingFix() {
  console.log('🔄 Starting batch Gold pricing fix...');
  
  try {
    // Get all RSR products
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    console.log(`📊 Total RSR products: ${allProducts.length}`);

    // Filter for products with matching Bronze and Gold pricing
    const matchingProducts = allProducts.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      return bronzePrice > 0 && goldPrice > 0 && bronzePrice === goldPrice;
    });

    console.log(`📊 Found ${matchingProducts.length} products with matching Bronze/Gold pricing`);

    if (matchingProducts.length === 0) {
      console.log('✅ No products found with matching Bronze/Gold pricing. All pricing looks correct.');
      return;
    }

    // Department-specific discount rates
    const departmentDiscounts = {
      '01': 0.05, // Handguns - 5% discount
      '05': 0.05, // Long Guns - 5% discount  
      '06': 0.05, // NFA - 5% discount
      '08': 0.05, // Optics - 5% discount
      '18': 0.05, // Ammunition - 5% discount
      '34': 0.05, // Parts - 5% discount
      'default': 0.05 // Default 5% discount
    };

    let updated = 0;
    let errors = 0;
    const batchSize = 100;
    const totalBatches = Math.ceil(matchingProducts.length / batchSize);
    const updateHistory: ProductUpdate[] = [];

    console.log('🔄 Processing in batches...');

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, matchingProducts.length);
      const batch = matchingProducts.slice(start, end);

      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} products)`);

      for (const product of batch) {
        try {
          const bronzePrice = parseFloat(product.priceBronze || '0');
          const department = product.departmentNumber || 'default';
          const discount = departmentDiscounts[department] || departmentDiscounts['default'];
          
          // Calculate new Gold price with discount
          const newGoldPrice = bronzePrice * (1 - discount);
          
          // Update database
          await db.update(products)
            .set({
              priceGold: newGoldPrice.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));

          updateHistory.push({
            id: product.id,
            sku: product.sku,
            oldGoldPrice: bronzePrice,
            newGoldPrice: newGoldPrice,
            department: department
          });

          updated++;
          
        } catch (error: any) {
          errors++;
          console.error(`❌ Error updating ${product.sku}:`, error.message);
        }
      }

      // Progress update
      console.log(`📊 Batch ${i + 1} complete: ${updated}/${matchingProducts.length} updated, ${errors} errors`);
    }

    console.log(`✅ Database update complete:`);
    console.log(`   📊 Products processed: ${matchingProducts.length}`);
    console.log(`   ✅ Products updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Now sync to Algolia
    console.log('\n🔄 Syncing updated pricing to Algolia...');
    await syncToAlgolia(updateHistory);

    // Show sample results
    console.log('\n📋 Sample of updated products:');
    const sampleSize = Math.min(10, updateHistory.length);
    for (let i = 0; i < sampleSize; i++) {
      const update = updateHistory[i];
      const savings = update.oldGoldPrice - update.newGoldPrice;
      const savingsPercent = ((savings / update.oldGoldPrice) * 100).toFixed(1);
      
      console.log(`${update.sku}: Dept ${update.department}`);
      console.log(`  Bronze: $${update.oldGoldPrice.toFixed(2)} → Gold: $${update.newGoldPrice.toFixed(2)} (${savingsPercent}% savings)`);
    }

    // Final verification
    const remainingMatching = allProducts.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      return bronzePrice > 0 && goldPrice > 0 && bronzePrice === goldPrice;
    });

    console.log(`\n🔍 Final verification: ${remainingMatching.length} products still have matching Bronze/Gold pricing`);
    
  } catch (error: any) {
    console.error('❌ Error in batch Gold pricing fix:', error);
  }
}

async function syncToAlgolia(updates: ProductUpdate[]) {
  const batchSize = 100;
  const totalBatches = Math.ceil(updates.length / batchSize);
  let synced = 0;
  let syncErrors = 0;

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, updates.length);
    const batch = updates.slice(start, end);

    try {
      // Get updated products from database
      const skus = batch.map(u => u.sku);
      const updatedProducts = await db
        .select()
        .from(products)
        .where(eq(products.distributor, 'RSR'))
        .limit(batchSize);

      const filteredProducts = updatedProducts.filter(p => skus.includes(p.sku));

      // Prepare Algolia objects
      const algoliaObjects = filteredProducts.map(product => ({
        objectID: product.sku,
        tierPricing: {
          bronze: parseFloat(product.priceBronze || '0'),
          gold: parseFloat(product.priceGold || '0'),
          platinum: parseFloat(product.pricePlatinum || '0')
        }
      }));

      // Update Algolia
      await index.partialUpdateObjects(algoliaObjects);
      synced += algoliaObjects.length;

    } catch (error: any) {
      syncErrors++;
      console.error(`❌ Algolia sync error for batch ${i + 1}:`, error.message);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`📊 Algolia sync progress: ${synced}/${updates.length} objects synced`);
    }
  }

  console.log(`✅ Algolia sync complete: ${synced}/${updates.length} objects synced, ${syncErrors} errors`);
}

// Run the fix
batchGoldPricingFix().catch(console.error);