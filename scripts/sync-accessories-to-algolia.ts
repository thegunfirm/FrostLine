/**
 * Sync Accessories to Algolia - Update Pricing Across All Accessory Departments
 * Synchronizes all accessory products to Algolia with 5% Gold discount pricing
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { sql, inArray } from "drizzle-orm";
import axios from "axios";

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY!;
const ALGOLIA_INDEX_NAME = 'products';

// All accessory department numbers
const ACCESSORY_DEPARTMENTS = [
  '09', // Optical Accessories
  '11', // Grips, Pads, Stocks, Bipods
  '12', // Soft Gun Cases, Packs, Bags
  '13', // Misc. Accessories
  '14', // Holsters & Pouches
  '17', // Closeout Accessories
  '20', // Lights, Lasers & Batteries
  '21', // Cleaning Equipment
  '25', // Safes & Security
  '26', // Safety & Protection
  '27', // Non-Lethal Defense
  '30', // Sights
  '31', // Optical Accessories
  '35'  // Slings & Swivels
];

async function syncAccessoriesToAlgolia() {
  console.log('🔧 Starting Accessories to Algolia sync...');

  try {
    // Get all accessory products across all departments
    const accessoryProducts = await db.select()
      .from(products)
      .where(inArray(products.departmentNumber, ACCESSORY_DEPARTMENTS));

    console.log(`📦 Found ${accessoryProducts.length} accessory products to sync`);

    if (accessoryProducts.length === 0) {
      console.log('✅ No accessory products to sync');
      return;
    }

    // Transform products for Algolia
    const algoliaRecords = accessoryProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturer,
      categoryName: "Accessories", // Unified category name for filtering
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
          console.log(`📝 Synced ${syncedCount} / ${algoliaRecords.length} accessory products to Algolia`);
        } else {
          console.error(`❌ Algolia batch failed:`, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error syncing batch ${i / batchSize + 1}:`, error);
      }
    }

    console.log(`✅ Accessories Algolia sync complete! Updated ${syncedCount} products`);
    console.log(`🔍 Accessory products now show 5% Gold member savings in search results`);

    // Show department breakdown
    const departmentBreakdown = ACCESSORY_DEPARTMENTS.map(dept => {
      const deptProducts = accessoryProducts.filter(p => p.departmentNumber === dept);
      return { department: dept, count: deptProducts.length };
    }).filter(d => d.count > 0);

    console.log('📊 Department breakdown:');
    departmentBreakdown.forEach(d => {
      console.log(`   Dept ${d.department}: ${d.count} products`);
    });

  } catch (error) {
    console.error('❌ Accessories Algolia sync failed:', error);
    throw error;
  }
}

// Run the script
syncAccessoriesToAlgolia()
  .then(() => {
    console.log('✅ Accessories Algolia sync complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

export { syncAccessoriesToAlgolia };