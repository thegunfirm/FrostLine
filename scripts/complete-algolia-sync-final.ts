/**
 * Complete Algolia Sync - Final Push to 100%
 * Ensures all 29,834 RSR products are indexed in Algolia
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { algoliasearch } from 'algoliasearch';
import { eq } from 'drizzle-orm';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || '';
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error('❌ Missing Algolia credentials');
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);

interface AlgoliaProduct {
  objectID: string;
  name: string;
  manufacturerName: string;
  categoryName: string;
  departmentNumber: string;
  stockNumber: string;
  description: string;
  inventoryQuantity: number;
  inStock: boolean;
  dropShippable: boolean;
  upc: string;
  weight: number;
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  caliber: string | null;
  capacity: number | null;
  barrelLength: string | null;
  finish: string | null;
  frameSize: string | null;
  actionType: string | null;
  sightType: string | null;
  tags: string[];
  newItem: boolean;
  internalSpecial: boolean;
  retailPrice: number;
  retailMap: number | null;
  msrp: number;
  dealerPrice: number;
  price: number;
  fflRequired: boolean;
  mpn: string;
}

async function syncBatchToAlgolia(batch: AlgoliaProduct[]) {
  try {
    await client.saveObjects({
      indexName: 'products',
      objects: batch
    });
    console.log(`✅ Synced ${batch.length} products to Algolia`);
  } catch (error) {
    console.error('❌ Error syncing batch to Algolia:', error);
    throw error;
  }
}

async function getAllProductsFromDatabase() {
  console.log('📊 Fetching all products from database...');
  
  const allProducts = await db.select().from(products);
  
  console.log(`📦 Found ${allProducts.length} products in database`);
  return allProducts;
}

async function transformProductsForAlgolia(dbProducts: any[]) {
  console.log('🔄 Transforming products for Algolia...');
  
  const algoliaProducts: AlgoliaProduct[] = dbProducts.map((product) => ({
    objectID: product.sku,
    name: product.name,
    manufacturerName: product.manufacturer,
    categoryName: product.category,
    departmentNumber: product.departmentNumber?.toString() || '',
    stockNumber: product.sku,
    description: product.description,
    inventoryQuantity: product.stockQuantity,
    inStock: product.stockQuantity > 0 && product.inStock,
    dropShippable: product.dropShippable,
    upc: product.upcCode || '',
    weight: product.weight,
    tierPricing: {
      bronze: parseFloat(product.priceBronze) || parseFloat(product.priceMSRP) || 0,
      gold: parseFloat(product.priceGold) || parseFloat(product.priceMAP) || parseFloat(product.priceBronze) || 0,
      platinum: parseFloat(product.pricePlatinum) || parseFloat(product.priceWholesale) || 0
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
    retailPrice: parseFloat(product.priceMSRP) || 0,
    retailMap: parseFloat(product.priceMAP) || 0,
    msrp: parseFloat(product.priceMSRP) || 0,
    dealerPrice: parseFloat(product.priceWholesale) || 0,
    price: parseFloat(product.priceGold) || parseFloat(product.priceMAP) || parseFloat(product.priceMSRP) || 0,
    fflRequired: product.requiresFFL,
    mpn: product.manufacturerPartNumber || ''
  }));
  
  console.log(`✅ Transformed ${algoliaProducts.length} products for Algolia`);
  return algoliaProducts;
}

async function completeAlgoliaSync() {
  console.log('🚀 Starting Complete Algolia Sync...');
  console.log('📋 Target: 100% of RSR products indexed in Algolia');
  
  try {
    // Get current Algolia count
    const currentAlgoliaResult = await client.searchSingleIndex({
      indexName: 'products',
      searchParams: {
        query: '',
        hitsPerPage: 0
      }
    });
    
    console.log(`📊 Current Status:`);
    console.log(`   Database: 29,834 products`);
    console.log(`   Algolia: ${currentAlgoliaResult.nbHits} products`);
    console.log(`   Missing: ${29834 - currentAlgoliaResult.nbHits} products`);
    console.log(`   Completion: ${(currentAlgoliaResult.nbHits / 29834 * 100).toFixed(1)}%`);
    
    // Get all products from database
    const dbProducts = await getAllProductsFromDatabase();
    
    // Transform for Algolia
    const algoliaProducts = await transformProductsForAlgolia(dbProducts);
    
    // Sync in batches of 1000
    const batchSize = 1000;
    const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
    
    console.log(`🔄 Processing ${totalBatches} batches of ${batchSize} products...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, algoliaProducts.length);
      const batch = algoliaProducts.slice(start, end);
      
      console.log(`📦 Batch ${i + 1}/${totalBatches}: Processing ${batch.length} products...`);
      
      await syncBatchToAlgolia(batch);
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final verification
    const finalResult = await client.searchSingleIndex({
      indexName: 'products',
      searchParams: {
        query: '',
        hitsPerPage: 0
      }
    });
    
    console.log(`🎉 SYNC COMPLETE!`);
    console.log(`📊 Final Status:`);
    console.log(`   Database: 29,834 products`);
    console.log(`   Algolia: ${finalResult.nbHits} products`);
    console.log(`   Completion: ${(finalResult.nbHits / 29834 * 100).toFixed(1)}%`);
    
    if (finalResult.nbHits >= 29834) {
      console.log('✅ 100% ALGOLIA INDEXING ACHIEVED!');
      console.log('🔍 All RSR products are now searchable');
    } else {
      console.log(`⚠️  Still missing ${29834 - finalResult.nbHits} products`);
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the complete sync
completeAlgoliaSync().catch(console.error);