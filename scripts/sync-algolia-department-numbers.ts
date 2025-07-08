/**
 * Sync Algolia Department Numbers
 * Updates Algolia index with corrected department numbers from database
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { isNotNull } from 'drizzle-orm';

async function syncAlgoliaWithDepartmentNumbers() {
  console.log('🔄 Syncing Algolia with updated department numbers...');
  
  try {
    // Get all products with department numbers
    const productsWithDepts = await db
      .select()
      .from(products)
      .where(isNotNull(products.departmentNumber))
      .orderBy(products.id);
    
    console.log(`📊 Found ${productsWithDepts.length} products with department numbers`);
    
    // Prepare batch updates for Algolia
    const batchSize = 1000;
    let processed = 0;
    
    for (let i = 0; i < productsWithDepts.length; i += batchSize) {
      const batch = productsWithDepts.slice(i, i + batchSize);
      
      // Transform to Algolia format
      const algoliaObjects = batch.map(product => ({
        objectID: product.sku,
        name: product.name,
        description: product.description,
        sku: product.sku,
        category: product.category,
        departmentNumber: product.departmentNumber,
        manufacturerName: product.manufacturer,
        tierPricing: {
          bronze: parseFloat(product.priceBronze || '0'),
          gold: parseFloat(product.priceGold || '0'),
          platinum: parseFloat(product.pricePlatinum || '0')
        },
        inventory: {
          onHand: product.stockQuantity || 0,
          allocated: product.allocated === 'Y'
        },
        inStock: product.inStock,
        distributor: product.distributor,
        images: product.images || []
      }));
      
      // Update Algolia index
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: algoliaObjects.map(obj => ({
            action: 'partialUpdateObject',
            body: obj
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Algolia batch update failed: ${response.statusText}`);
      }
      
      processed += batch.length;
      console.log(`⚡ Updated ${processed}/${productsWithDepts.length} products in Algolia`);
    }
    
    console.log('✅ Algolia sync completed successfully');
    
    // Test the updated index
    console.log('\n🧪 Testing updated Algolia index...');
    const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 1
      })
    });
    
    const testResults = await testResponse.json();
    console.log(`📈 Department 01 products in Algolia: ${testResults.nbHits}`);
    
  } catch (error) {
    console.error('❌ Algolia sync failed:', error);
  }
}

// Run the sync
syncAlgoliaWithDepartmentNumbers();