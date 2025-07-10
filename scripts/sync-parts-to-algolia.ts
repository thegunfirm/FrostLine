/**
 * Sync Parts to Algolia - Update Pricing
 * Synchronizes all Parts products to Algolia with new 5% Gold discount pricing
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = 'products';

async function syncPartsToAlgolia() {
  console.log('🔧 Starting Parts to Algolia sync...');

  try {
    // Get all Parts products (Department 34)
    const partsProducts = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '34'));

    console.log(`📦 Found ${partsProducts.length} Parts products to sync`);

    if (partsProducts.length === 0) {
      console.log('✅ No Parts products to sync');
      return;
    }

    // Transform products for Algolia
    const algoliaRecords = partsProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturerName,
      categoryName: product.categoryName,
      departmentNumber: product.departmentNumber,
      priceBronze: product.priceBronze,
      priceGold: product.priceGold,
      pricePlatinum: product.pricePlatinum,
      tierPricing: {
        bronze: product.priceBronze,
        gold: product.priceGold,
        platinum: product.pricePlatinum
      },
      retailPrice: product.priceBronze, // Use Bronze as retail price
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl,
      tags: product.tags,
      distributor: "RSR"
    }));

    // Send to Algolia in batches
    const batchSize = 100;
    let syncedCount = 0;

    for (let i = 0; i < algoliaRecords.length; i += batchSize) {
      const batch = algoliaRecords.slice(i, i + batchSize);
      
      try {
        const response = await axios.post(
          `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`,
          {
            requests: batch.map(record => ({
              action: 'updateObject',
              body: record
            }))
          },
          {
            headers: {
              'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
              'X-Algolia-Application-Id': ALGOLIA_APP_ID,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.status === 200) {
          syncedCount += batch.length;
          console.log(`📝 Synced ${syncedCount} / ${algoliaRecords.length} Parts products to Algolia`);
        } else {
          console.error(`❌ Algolia batch failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error syncing batch ${i / batchSize + 1}:`, error);
      }
    }

    console.log(`✅ Parts Algolia sync complete! Updated ${syncedCount} products`);
    console.log(`🔍 Parts products now show 5% Gold member savings in search results`);

  } catch (error) {
    console.error('❌ Parts Algolia sync failed:', error);
    throw error;
  }
}

// Run the script
syncPartsToAlgolia()
  .then(() => {
    console.log('✅ Parts Algolia sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

export { syncPartsToAlgolia };