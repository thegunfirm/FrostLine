/**
 * Sync Optics Type and Zoom to Algolia
 * Updates type and zoom data for all optics products in Algolia search index
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, or, isNotNull } from 'drizzle-orm';

async function syncOpticsTypeZoomToAlgolia() {
  console.log('🔧 Starting optics type and zoom sync to Algolia...');
  
  // Get all optics products (department 08) with type or zoom data
  const opticsWithData = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '08'),
        or(
          isNotNull(products.sightType),
          isNotNull(products.frameSize)
        )
      )
    );
  
  console.log(`📊 Found ${opticsWithData.length} optics products with type or zoom data`);
  
  // Count by type
  const typeCount: { [key: string]: number } = {};
  const zoomCount: { [key: string]: number } = {};
  
  opticsWithData.forEach(product => {
    if (product.sightType) {
      typeCount[product.sightType] = (typeCount[product.sightType] || 0) + 1;
    }
    if (product.frameSize) {
      zoomCount[product.frameSize] = (zoomCount[product.frameSize] || 0) + 1;
    }
  });
  
  console.log(`📊 Top 10 Type Distribution:`);
  Object.entries(typeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} products`);
    });
  
  console.log(`📊 Top 10 Zoom Distribution:`);
  Object.entries(zoomCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([zoom, count]) => {
      console.log(`   ${zoom}: ${count} products`);
    });
  
  // Batch update Algolia using HTTP API
  const batchSize = 50;
  let updateCount = 0;
  
  for (let i = 0; i < opticsWithData.length; i += batchSize) {
    const batch = opticsWithData.slice(i, i + batchSize);
    
    const algoliaUpdates = batch.map(product => {
      const update: any = {
        objectID: product.sku || product.stockNumber
      };
      
      if (product.sightType) {
        update.sightType = product.sightType;
      }
      
      if (product.frameSize) {
        update.frameSize = product.frameSize;
      }
      
      return update;
    });
    
    try {
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: algoliaUpdates.map(obj => ({
            action: 'partialUpdateObject',
            body: obj
          }))
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error! status: ${response.status}, response: ${errorText}`);
        break;
      }
      
      updateCount += batch.length;
      console.log(`✅ Updated ${updateCount}/${opticsWithData.length} products`);
      
      // Small delay to avoid rate limiting
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`❌ Error updating batch:`, error);
      break;
    }
  }
  
  console.log(`🎯 Successfully synced type and zoom data for ${updateCount} optics products`);
  console.log(`📊 Final type and zoom distribution synchronized to Algolia`);
  
  return {
    total: opticsWithData.length,
    updated: updateCount,
    types: typeCount,
    zooms: zoomCount
  };
}

// Run the sync
syncOpticsTypeZoomToAlgolia()
  .then((result) => {
    console.log('✅ Optics type and zoom sync to Algolia completed');
    console.log(`🎯 Synced ${result.updated} products with type and zoom data`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Optics type and zoom sync to Algolia failed:', error);
    process.exit(1);
  });

export { syncOpticsTypeZoomToAlgolia };