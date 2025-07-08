/**
 * Clear and Resync Algolia Index
 * Completely rebuilds Algolia index with current database data
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const ALGOLIA_INDEX_NAME = 'products';

/**
 * Clear and rebuild Algolia index
 */
async function clearAndResyncAlgolia() {
  console.log('🔄 Starting complete Algolia index rebuild...');
  
  try {
    // Step 1: Clear the existing index
    console.log('🗑️ Clearing existing Algolia index...');
    const clearResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/clear`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID!,
        'Content-Type': 'application/json',
      },
    });
    
    if (!clearResponse.ok) {
      throw new Error(`Failed to clear index: ${clearResponse.statusText}`);
    }
    
    console.log('✅ Index cleared');
    
    // Step 2: Get all products with proper department numbers
    console.log('📊 Fetching current database products...');
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    console.log(`📦 Found ${allProducts.length} Department 01 products to sync`);
    
    // Count by category
    const categoryCounts = allProducts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Category breakdown:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} products`);
    });
    
    // Step 3: Prepare Algolia records
    const algoliaRecords = allProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      departmentNumber: product.departmentNumber || '',
      manufacturer: product.manufacturer,
      manufacturerName: product.manufacturer,
      sku: product.sku,
      inStock: product.inStock,
      quantity: product.stockQuantity || 0,
      retailPrice: parseFloat(product.retailPrice || '0'),
      dealerPrice: parseFloat(product.dealerPrice || '0'),
      msrp: parseFloat(product.msrp || '0'),
      retailMap: parseFloat(product.retailMap || '0'),
      tierPricing: {
        bronze: parseFloat(product.priceBronze || '0'),
        gold: parseFloat(product.priceGold || '0'),
        platinum: parseFloat(product.pricePlatinum || '0'),
      },
      requiresFFL: product.requiresFFL || false,
      tags: product.tags || [],
      imageUrl: product.imageUrl || null,
      createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
    }));
    
    // Step 4: Send to Algolia in batches
    console.log('🚀 Uploading to Algolia...');
    
    const batchSize = 100;
    let uploaded = 0;
    
    for (let i = 0; i < algoliaRecords.length; i += batchSize) {
      const batch = algoliaRecords.slice(i, i + batchSize);
      
      const response = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': ALGOLIA_APP_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: batch.map(record => ({
            action: 'addObject',
            body: record,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Algolia batch upload failed: ${response.statusText}`);
      }
      
      uploaded += batch.length;
      console.log(`⚡ Uploaded ${uploaded}/${algoliaRecords.length} products...`);
    }
    
    console.log('✅ Complete Algolia rebuild finished');
    console.log(`📦 Total products uploaded: ${uploaded}`);
    console.log('🔍 Search should now work properly with authentic data');
    
  } catch (error) {
    console.error('💥 Algolia rebuild failed:', error);
    throw error;
  }
}

// Run the rebuild
clearAndResyncAlgolia()
  .then(() => {
    console.log('✅ Algolia index rebuild completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Algolia rebuild failed:', error);
    process.exit(1);
  });