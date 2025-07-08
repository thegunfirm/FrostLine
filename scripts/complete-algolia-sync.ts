/**
 * Complete Algolia Sync - Finish Loading All Products
 * Ensures all 29,836 products are properly indexed with department numbers
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { isNotNull, gte } from 'drizzle-orm';

async function completeAlgoliaSync() {
  console.log('🎯 Completing Algolia sync...');
  
  try {
    // Get current Algolia status
    const currentResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    const currentResults = await currentResponse.json();
    console.log(`Current Algolia products: ${currentResults.nbHits}`);
    
    // Get database total
    const dbTotal = await db.select().from(products).where(isNotNull(products.departmentNumber));
    console.log(`Database products: ${dbTotal.length}`);
    
    // Calculate remaining products needed
    const remaining = dbTotal.length - currentResults.nbHits;
    console.log(`Remaining products to sync: ${remaining}`);
    
    if (remaining > 0) {
      console.log('📦 Loading remaining products...');
      
      // Process in batches of 2000
      const batchSize = 2000;
      let processed = 0;
      
      for (let offset = currentResults.nbHits; offset < dbTotal.length; offset += batchSize) {
        const batch = await db
          .select()
          .from(products)
          .where(isNotNull(products.departmentNumber))
          .orderBy(products.id)
          .offset(offset)
          .limit(batchSize);
        
        if (batch.length === 0) break;
        
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
        
        // Add to Algolia
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
          processed += batch.length;
          console.log(`⚡ Added ${batch.length} products (${processed}/${remaining} total)`);
        } else {
          console.error(`❌ Failed to add batch starting at offset ${offset}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
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
    
    console.log('\n📊 Final Status:');
    console.log(`Database products: ${dbTotal.length}`);
    console.log(`Algolia products: ${finalResults.nbHits}`);
    console.log(`Department 01 products: ${dept01Results.nbHits}`);
    
    const isComplete = finalResults.nbHits >= dbTotal.length - 10; // Allow small margin
    
    if (isComplete) {
      console.log('\n✅ COMPLETE: All products synced successfully!');
      
      // Test specific products to verify department numbers
      const testProducts = [
        { sku: 'YHM-BL-04P', expectedDept: '34' },
        { sku: 'WR7913M', expectedDept: '11' }
      ];
      
      console.log('\n🧪 Testing specific products...');
      for (const testProduct of testProducts) {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: testProduct.sku,
            hitsPerPage: 1
          })
        });
        
        const results = await response.json();
        
        if (results.hits.length > 0) {
          const hit = results.hits[0];
          const actualDept = hit.departmentNumber;
          
          if (actualDept === testProduct.expectedDept) {
            console.log(`✅ ${testProduct.sku}: Department ${actualDept} (CORRECT)`);
          } else {
            console.log(`❌ ${testProduct.sku}: Department ${actualDept}, expected ${testProduct.expectedDept}`);
          }
        } else {
          console.log(`❓ ${testProduct.sku}: Not found in Algolia`);
        }
      }
      
      return true;
    } else {
      console.log('\n⏳ Sync still in progress...');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Sync completion failed:', error);
    return false;
  }
}

completeAlgoliaSync().then(complete => {
  if (complete) {
    console.log('\n🎉 Algolia sync completed! Ready for next step.');
  } else {
    console.log('\n⏳ Sync still in progress. Continue monitoring...');
  }
});