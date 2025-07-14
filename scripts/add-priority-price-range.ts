/**
 * Add Priority Price Range Field to Handgun Products
 * Automatically prioritizes handguns in $400-$800 range as most likely to be purchased
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function addPriorityPriceRange() {
  console.log('🎯 Adding priority price range field to handgun products...');
  
  try {
    // Get all handgun products
    const handgunProducts = await db.select().from(products).where(eq(products.departmentNumber, '01'));
    
    console.log(`📊 Found ${handgunProducts.length} handgun products`);
    
    let updatedCount = 0;
    let priorityRangeCount = 0;
    
    // Process in batches for Algolia
    const batchSize = 100;
    
    for (let i = 0; i < handgunProducts.length; i += batchSize) {
      const batch = handgunProducts.slice(i, i + batchSize);
      const algoliaUpdates = [];
      
      for (const product of batch) {
        // Parse pricing to check if it's in $400-$800 range
        const platinumPrice = parseFloat(product.pricePlatinum || '0');
        const isPriorityRange = platinumPrice >= 400 && platinumPrice <= 800;
        
        if (isPriorityRange) {
          priorityRangeCount++;
        }
        
        // Add to Algolia update
        algoliaUpdates.push({
          action: 'partialUpdateObject',
          body: {
            objectID: product.sku,
            isPriorityPriceRange: isPriorityRange
          }
        });
        
        updatedCount++;
      }
      
      // Update Algolia in batches using HTTP API
      if (algoliaUpdates.length > 0) {
        try {
          const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
            method: 'POST',
            headers: {
              'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
              'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: algoliaUpdates
            })
          });
          
          if (response.ok) {
            console.log(`✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(handgunProducts.length / batchSize)}`);
          } else {
            console.error(`❌ Algolia batch update failed for batch ${i}-${i + batchSize}`);
          }
        } catch (error) {
          console.error(`❌ Error updating batch ${i}-${i + batchSize}:`, error);
        }
      }
    }
    
    console.log(`🎯 Priority price range classification complete:`);
    console.log(`   • Total handgun products: ${handgunProducts.length}`);
    console.log(`   • Products in $400-$800 range: ${priorityRangeCount} (${(priorityRangeCount / handgunProducts.length * 100).toFixed(1)}%)`);
    console.log(`   • Products outside priority range: ${handgunProducts.length - priorityRangeCount}`);
    console.log(`   • Algolia updates: ${updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error adding priority price range:', error);
    throw error;
  }
}

// Run the script
addPriorityPriceRange()
  .then(() => {
    console.log('✅ Priority price range field addition completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Priority price range field addition failed:', error);
    process.exit(1);
  });