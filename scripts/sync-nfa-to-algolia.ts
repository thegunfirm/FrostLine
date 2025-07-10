/**
 * Sync NFA to Algolia - Update Category and Pricing
 * Synchronizes all NFA products to Algolia with correct category name and 5% Gold discount pricing
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = 'products';

async function syncNFAToAlgolia() {
  console.log('🔫 Starting NFA to Algolia sync...');

  try {
    // Get all NFA products (Department 06)
    const nfaProducts = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '06'));

    console.log(`📦 Found ${nfaProducts.length} NFA products to sync`);

    if (nfaProducts.length === 0) {
      console.log('✅ No NFA products to sync');
      return;
    }

    // Transform products for Algolia
    const algoliaRecords = nfaProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturer,
      categoryName: "NFA", // Set correct category name for filtering
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
      imageUrl: product.images ? JSON.parse(product.images as string)?.[0]?.url : null,
      tags: product.tags || [],
      distributor: "RSR",
      requiresFFL: product.requiresFFL
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
          console.log(`📝 Synced ${syncedCount} / ${algoliaRecords.length} NFA products to Algolia`);
        } else {
          console.error(`❌ Algolia batch failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error syncing batch ${i / batchSize + 1}:`, error);
      }
    }

    console.log(`✅ NFA Algolia sync complete! Updated ${syncedCount} products`);
    console.log(`🔍 NFA products now searchable with correct category and Gold member savings`);

  } catch (error) {
    console.error('❌ NFA Algolia sync failed:', error);
    throw error;
  }
}

// Run the script
syncNFAToAlgolia()
  .then(() => {
    console.log('✅ NFA Algolia sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

export { syncNFAToAlgolia };