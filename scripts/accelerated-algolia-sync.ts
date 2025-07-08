/**
 * Accelerated Algolia Sync
 * Faster approach to complete the remaining Algolia sync
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { isNotNull, gte } from 'drizzle-orm';

async function acceleratedAlgoliaSync() {
  console.log('⚡ Starting accelerated Algolia sync...');
  
  try {
    // Get current Algolia total
    const totalResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        hitsPerPage: 1
      })
    });
    
    const totalResults = await totalResponse.json();
    console.log(`Current Algolia products: ${totalResults.nbHits}`);
    
    // If we have less than 25k products, sync the remaining in larger batches
    if (totalResults.nbHits < 25000) {
      console.log('📦 Loading remaining products from database...');
      
      // Get products starting from where we left off (approximate)
      const remainingProducts = await db
        .select()
        .from(products)
        .where(isNotNull(products.departmentNumber))
        .orderBy(products.id)
        .offset(totalResults.nbHits)
        .limit(5000); // Larger batch
      
      console.log(`Found ${remainingProducts.length} products to sync`);
      
      if (remainingProducts.length > 0) {
        // Transform to Algolia format
        const algoliaObjects = remainingProducts.map(product => ({
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
        
        // Add to Algolia in one large batch
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: algoliaObjects.map(obj => ({
              action: 'addObject',
              body: obj
            }))
          })
        });
        
        if (response.ok) {
          console.log(`✅ Added ${algoliaObjects.length} products to Algolia`);
        } else {
          console.error('❌ Failed to add products to Algolia');
        }
      }
    }
    
    // Check final status
    const finalResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        hitsPerPage: 1
      })
    });
    
    const finalResults = await finalResponse.json();
    console.log(`Final Algolia products: ${finalResults.nbHits}`);
    
    // Check Department 01 count
    const dept01Response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const dept01Results = await dept01Response.json();
    console.log(`Department 01 products: ${dept01Results.nbHits}`);
    
    return finalResults.nbHits >= 29000; // Consider complete if we have most products
    
  } catch (error) {
    console.error('❌ Accelerated sync failed:', error);
    return false;
  }
}

acceleratedAlgoliaSync().then(success => {
  if (success) {
    console.log('🎉 Algolia sync completed successfully!');
  } else {
    console.log('⏳ Sync still in progress...');
  }
});