/**
 * Fix Algolia Duplicates - Clear and Rebuild Index
 * Clears the index and rebuilds with exactly 29,834 products
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { algoliasearch } from 'algoliasearch';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || '';
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error('Missing Algolia credentials');
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);

async function fixAlgoliaDuplicates() {
  console.log('🔧 Fixing Algolia duplicates...');
  
  try {
    // Step 1: Clear the index
    console.log('🧹 Clearing Algolia index...');
    await client.clearObjects({ indexName: 'products' });
    console.log('✅ Index cleared');
    
    // Step 2: Wait for clearing to complete
    console.log('⏳ Waiting for index clearing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: Get all products from database
    console.log('📊 Fetching products from database...');
    const allProducts = await db.select().from(products);
    console.log(`📦 Found ${allProducts.length} products in database`);
    
    // Step 4: Transform for Algolia
    const algoliaProducts = allProducts.map((product) => ({
      objectID: product.stockNumber,
      name: product.name,
      manufacturerName: product.manufacturerName,
      categoryName: product.categoryName,
      departmentNumber: product.departmentNumber?.toString() || '',
      stockNumber: product.stockNumber,
      description: product.description,
      inventoryQuantity: product.inventoryQuantity,
      inStock: product.inventoryQuantity > 0,
      dropShippable: product.dropShippable,
      upc: product.upc || '',
      weight: product.weight,
      tierPricing: {
        bronze: product.tierPricing?.bronze || product.msrp,
        gold: product.tierPricing?.gold || product.retailMap || product.msrp,
        platinum: product.tierPricing?.platinum || product.dealerPrice
      },
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrelLength,
      finish: product.finish,
      frameSize: product.frameSize,
      actionType: product.actionType,
      sightType: product.sightType,
      tags: product.tags || [],
      newItem: product.newItem,
      internalSpecial: product.internalSpecial,
      retailPrice: product.retailPrice,
      retailMap: product.retailMap,
      msrp: product.msrp,
      dealerPrice: product.dealerPrice,
      price: product.tierPricing?.gold || product.retailMap || product.msrp,
      fflRequired: product.fflRequired,
      mpn: product.mpn || ''
    }));
    
    // Step 5: Sync in batches
    const batchSize = 1000;
    const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
    
    console.log(`🔄 Syncing ${totalBatches} batches of ${batchSize} products...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, algoliaProducts.length);
      const batch = algoliaProducts.slice(start, end);
      
      console.log(`📦 Batch ${i + 1}/${totalBatches}: ${batch.length} products`);
      
      await client.saveObjects({
        indexName: 'products',
        objects: batch
      });
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 6: Verify final count
    console.log('⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalResult = await client.searchSingleIndex({
      indexName: 'products',
      searchParams: {
        query: '',
        hitsPerPage: 0
      }
    });
    
    console.log(`🎉 ALGOLIA INDEXING COMPLETE!`);
    console.log(`📊 Final Results:`);
    console.log(`   Database: ${allProducts.length} products`);
    console.log(`   Algolia: ${finalResult.nbHits} products`);
    console.log(`   Match: ${finalResult.nbHits === allProducts.length ? '✅ Perfect' : '❌ Mismatch'}`);
    
    if (finalResult.nbHits === allProducts.length) {
      console.log('🔍 100% of RSR products are now searchable!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
    process.exit(1);
  }
}

fixAlgoliaDuplicates().catch(console.error);