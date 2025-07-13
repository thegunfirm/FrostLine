/**
 * Sync Updated Pricing to Algolia
 * Updates Algolia search index with the new department-specific Gold pricing
 */

import { algoliasearch } from 'algoliasearch';
import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function syncUpdatedPricingToAlgolia() {
  console.log('🔄 Starting Algolia pricing sync...');
  
  try {
    // Initialize Algolia client
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_ADMIN_API_KEY!
    );
    const index = client.initIndex('products');

    // Get all RSR products with updated pricing
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    console.log(`📊 Found ${allProducts.length} RSR products to sync`);

    // Transform products for Algolia
    const algoliaProducts = allProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      departmentNumber: product.departmentNumber,
      stockNumber: product.sku,
      inventoryQuantity: product.inventoryQuantity,
      inStock: product.inventoryQuantity > 0,
      dropShippable: product.dropShippable,
      upc: product.upc,
      weight: product.weight,
      tierPricing: {
        bronze: parseFloat(product.priceBronze?.toString() || '0'),
        gold: parseFloat(product.priceGold?.toString() || '0'),
        platinum: parseFloat(product.pricePlatinum?.toString() || '0')
      },
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrelLength,
      finish: product.finish,
      frameSize: product.frameSize,
      actionType: product.actionType,
      sightType: product.sightType,
      tags: product.tags || [],
      newItem: product.newItem,
      internalSpecial: product.internalSpecial,
      retailPrice: parseFloat(product.retailPrice?.toString() || '0'),
      retailMap: product.retailMap ? parseFloat(product.retailMap.toString()) : null,
      msrp: parseFloat(product.msrp?.toString() || '0'),
      dealerPrice: parseFloat(product.dealerPrice?.toString() || '0'),
      price: parseFloat(product.pricePlatinum?.toString() || '0'),
      fflRequired: product.fflRequired,
      mpn: product.mpn
    }));

    // Update Algolia in batches
    const batchSize = 1000;
    const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
    let totalSynced = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, algoliaProducts.length);
      const batch = algoliaProducts.slice(start, end);

      console.log(`📦 Syncing batch ${i + 1}/${totalBatches} (${batch.length} products)`);

      await index.saveObjects(batch);
      totalSynced += batch.length;

      console.log(`   ✅ Synced ${totalSynced}/${algoliaProducts.length} products`);
    }

    console.log(`\n✅ Algolia pricing sync completed successfully!`);
    console.log(`   📊 Total products synced: ${totalSynced}`);

    // Verification - check a few sample products
    console.log('\n🔍 Verification - Sample products in Algolia:');
    
    const sampleSkus = ['AFA1-45-BK-14', 'KRKV22-CFD00', 'FEAE300BLK1'];
    
    for (const sku of sampleSkus) {
      try {
        const algoliaProduct = await index.getObject(sku);
        console.log(`   ${sku}:`);
        console.log(`     Bronze: $${algoliaProduct.tierPricing.bronze}`);
        console.log(`     Gold: $${algoliaProduct.tierPricing.gold}`);
        console.log(`     Platinum: $${algoliaProduct.tierPricing.platinum}`);
      } catch (error) {
        console.log(`   ${sku}: Not found in Algolia`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error syncing pricing to Algolia:', error);
  }
}

// Run the Algolia sync
syncUpdatedPricingToAlgolia().catch(console.error);