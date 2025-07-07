/**
 * Sync Updated Categories to Algolia
 * Updates all products in Algolia index with corrected categories
 */

import { db } from "../server/db";
import { products } from "../shared/schema";

// Configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const BATCH_SIZE = 1000;

/**
 * Map product to Algolia format
 */
function mapProductToAlgolia(product: any) {
  // Parse pricing data properly handling snake_case and camelCase
  const bronzePrice = parseFloat(product.price_bronze || product.priceBronze || '0');
  const goldPrice = parseFloat(product.price_gold || product.priceGold || '0');
  const platinumPrice = parseFloat(product.price_platinum || product.pricePlatinum || '0');
  
  return {
    objectID: product.sku || product.id.toString(),
    title: product.name,
    name: product.name,
    description: product.description || '',
    category: product.category,
    manufacturer: product.manufacturer || 'Unknown',
    manufacturerName: product.manufacturer || 'Unknown',
    categoryName: product.category,
    sku: product.sku,
    inStock: product.inStock || false,
    quantity: product.stockQuantity || 0,
    retailPrice: bronzePrice,
    dealerPrice: parseFloat(product.priceWholesale || '0'),
    msrp: bronzePrice,
    retailMap: goldPrice,
    // Add the tierPricing structure that frontend expects
    tierPricing: {
      bronze: bronzePrice,
      gold: goldPrice > 0 ? goldPrice : null, // Hide Gold pricing when not available
      platinum: platinumPrice
    },
    requiresFFL: product.requiresFFL || false,
    tags: (() => {
      // Start with basic tags
      const basicTags = [
        product.category,
        product.manufacturer || 'Unknown',
        product.requiresFFL ? 'Firearms' : 'Non-Firearms'
      ];
      
      // Add RSR tags if they exist (these contain important product classification)
      if (product.tags && Array.isArray(product.tags)) {
        basicTags.push(...product.tags);
      }
      
      // Remove duplicates and return
      return [...new Set(basicTags)];
    })(),
    imageUrl: product.images && Array.isArray(product.images) && product.images.length > 0 
      ? product.images[0] 
      : `/api/rsr-image/${product.sku}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Sync products to Algolia in batches
 */
async function syncCategoriesToAlgolia() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    console.error('❌ Missing Algolia credentials');
    return;
  }

  console.log('🔄 Starting Algolia category sync...');

  try {
    // Get total count
    const totalCount = await db.select().from(products);
    console.log(`📊 Found ${totalCount.length} products to sync`);

    let syncedCount = 0;
    const errors = [];

    // Process in batches
    for (let offset = 0; offset < totalCount.length; offset += BATCH_SIZE) {
      const batch = totalCount.slice(offset, offset + BATCH_SIZE);
      
      console.log(`📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount.length / BATCH_SIZE)} (${batch.length} products)`);

      // Convert to Algolia format
      const algoliaObjects = batch.map(mapProductToAlgolia);

      try {
        // Update Algolia using HTTP API
        const response = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
            'X-Algolia-Application-Id': ALGOLIA_APP_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: algoliaObjects.map(obj => ({
              action: 'updateObject',
              body: obj
            }))
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Batch ${Math.floor(offset / BATCH_SIZE) + 1} failed:`, errorText);
          errors.push(`Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${errorText}`);
          continue;
        }

        const result = await response.json();
        console.log(`✅ Batch ${Math.floor(offset / BATCH_SIZE) + 1} completed (${result.objectIDs?.length || batch.length} objects)`);
        syncedCount += batch.length;

      } catch (error) {
        console.error(`❌ Error processing batch ${Math.floor(offset / BATCH_SIZE) + 1}:`, error);
        errors.push(`Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${error}`);
      }

      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 Algolia sync complete!`);
    console.log(`📊 Synced: ${syncedCount}/${totalCount.length} products`);
    
    if (errors.length > 0) {
      console.log(`⚠️  Errors: ${errors.length}`);
      errors.forEach(error => console.log(`   ${error}`));
    }

  } catch (error) {
    console.error('💥 Fatal error during Algolia sync:', error);
    throw error;
  }
}

// Run the sync
syncCategoriesToAlgolia().then(() => {
  console.log('✅ Algolia category sync completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Algolia sync failed:', error);
  process.exit(1);
});