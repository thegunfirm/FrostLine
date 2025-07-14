/**
 * Sync Categorized Products to Algolia
 * Updates Algolia index with the newly categorized lowers and uppers
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function syncCategorizedProducts() {
  console.log('🔄 Syncing categorized products to Algolia...');
  
  try {
    // Get all products that were moved to Uppers/Lowers category
    const categorizedProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, manufacturer, category, 
        receiver_type, price_bronze, price_gold, price_platinum,
        stock_quantity, description, weight, upc_code,
        drop_shippable, new_item, in_stock, requires_ffl, caliber
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${categorizedProducts.rows.length} products to sync`);
    
    // Prepare Algolia updates
    const algoliaUpdates = [];
    
    for (const product of categorizedProducts.rows) {
      const algoliaObject = {
        objectID: product.sku,
        name: product.name,
        manufacturerName: product.manufacturer,
        categoryName: product.category,
        departmentNumber: product.department_number,
        receiverType: product.receiver_type,
        tierPricing: {
          bronze: parseFloat(product.price_bronze || '0'),
          gold: parseFloat(product.price_gold || '0'),
          platinum: parseFloat(product.price_platinum || '0')
        },
        inventoryQuantity: product.stock_quantity || 0,
        description: product.description || '',
        weight: parseFloat(product.weight || '0'),
        upc: product.upc_code || '',
        dropShippable: product.drop_shippable,
        newItem: product.new_item,
        inStock: product.in_stock,
        fflRequired: product.requires_ffl,
        caliber: product.caliber,
        stockNumber: product.sku,
        sku: product.sku,
        distributor: 'RSR'
      };
      
      algoliaUpdates.push({
        action: 'addObject',
        body: algoliaObject
      });
    }
    
    // Update Algolia in batches
    const batchSize = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch
          })
        });
        
        if (response.ok) {
          updatedCount += batch.length;
          console.log(`✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(algoliaUpdates.length / batchSize)}`);
        } else {
          console.error(`❌ Algolia batch update failed for batch ${i}-${i + batchSize}`);
        }
      } catch (error) {
        console.error(`❌ Error updating batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    console.log('🎯 Sync complete:');
    console.log(`   • Products synced: ${updatedCount}`);
    console.log(`   • Receiver types updated: ${categorizedProducts.rows.filter(p => p.receiver_type).length}`);
    console.log('✅ All categorized products synchronized to Algolia');
    
  } catch (error) {
    console.error('❌ Error syncing categorized products:', error);
    process.exit(1);
  }
}

// Run the sync
syncCategorizedProducts();