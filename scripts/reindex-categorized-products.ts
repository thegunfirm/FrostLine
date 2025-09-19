/**
 * Partial Algolia Reindex for Category Fix
 * Syncs products that were recategorized during the rifles crisis fix
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function reindexCategorizedProducts() {
  console.log('🔄 Performing partial Algolia reindex for categorized products...');
  
  try {
    // Get products from the categories that were most affected by our fix
    const affectedProducts = await db.execute(sql`
      SELECT 
        id, name, sku, category, manufacturer, description, 
        price_bronze, price_gold, price_platinum, price_msrp,
        stock_quantity, in_stock, upc_code, drop_shippable, 
        requires_ffl, caliber, new_item
      FROM products 
      WHERE category IN ('Rifles', 'Shotguns', 'Handguns')
      ORDER BY category, name
    `);
    
    console.log(`📊 Found ${affectedProducts.rows.length} products to reindex`);
    
    // Prepare Algolia batch updates
    const algoliaUpdates = [];
    
    for (const product of affectedProducts.rows) {
      const algoliaObject = {
        objectID: product.sku,
        name: product.name,
        title: product.name,
        manufacturerName: product.manufacturer,
        categoryName: product.category,
        description: product.description || '',
        sku: product.sku,
        upc: product.upc_code || '',
        tierPricing: {
          bronze: parseFloat(product.price_bronze || '0'),
          gold: parseFloat(product.price_gold || '0'),
          platinum: parseFloat(product.price_platinum || '0')
        },
        msrp: parseFloat(product.price_msrp || '0'),
        inventoryQuantity: product.stock_quantity || 0,
        inStock: product.in_stock,
        dropShippable: product.drop_shippable,
        newItem: product.new_item,
        fflRequired: product.requires_ffl,
        caliber: product.caliber,
        isActive: true,
        searchableText: `${product.name} ${product.manufacturer} ${product.category} ${product.sku}`,
        tags: [product.category, product.manufacturer],
        popularityScore: 1.0,
        updatedAt: new Date().toISOString()
      };
      
      algoliaUpdates.push({
        action: 'addObject',
        body: algoliaObject
      });
    }
    
    // Process in batches of 100
    const batchSize = 100;
    let updatedCount = 0;
    
    console.log(`📦 Processing ${algoliaUpdates.length} updates in batches of ${batchSize}...`);
    
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
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Algolia API error: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        updatedCount += batch.length;
        
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} products updated (${updatedCount}/${algoliaUpdates.length})`);
        
        // Small delay between batches to avoid rate limits
        if (i + batchSize < algoliaUpdates.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Error updating batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }
    
    console.log(`🎉 Partial reindex complete! Updated ${updatedCount} products in Algolia`);
    console.log('📊 Category breakdown:');
    
    // Show category breakdown
    const categoryBreakdown = {};
    for (const product of affectedProducts.rows) {
      const category = product.category;
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    }
    
    for (const [category, count] of Object.entries(categoryBreakdown)) {
      console.log(`   ${category}: ${count} products`);
    }
    
  } catch (error) {
    console.error('❌ Reindex failed:', error);
    process.exit(1);
  }
}

// Auto-run when executed directly
reindexCategorizedProducts();

export { reindexCategorizedProducts };