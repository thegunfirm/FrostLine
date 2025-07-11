/**
 * Force Complete Algolia Sync
 * Aggressively syncs the remaining products to reach 100% completion
 */

import { db } from '../server/db';
import { algoliasearch } from 'algoliasearch';

const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);

const algoliaIndex = algoliaClient.initIndex('products');

interface AlgoliaProduct {
  objectID: string;
  title: string;
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

async function forceCompleteSync() {
  console.log('🐘 Connected to Neon serverless PostgreSQL');
  console.log('🚀 Force completing Algolia sync...');
  
  // Get current Algolia count
  const { nbHits: currentCount } = await algoliaIndex.browse({ hitsPerPage: 1 });
  console.log(`📊 Current Algolia products: ${currentCount}`);
  
  // Get all products from database
  const dbProducts = await db.query.products.findMany({
    orderBy: (products, { desc }) => [desc(products.inventoryQuantity)]
  });
  
  console.log(`📦 Database products: ${dbProducts.length}`);
  
  // Get existing Algolia objectIDs
  const existingIds = new Set<string>();
  await algoliaIndex.browseObjects({
    query: '',
    attributesToRetrieve: ['objectID'],
    batch: (batch) => {
      batch.forEach(hit => existingIds.add(hit.objectID));
    }
  });
  
  console.log(`📋 Found ${existingIds.size} existing Algolia products`);
  
  // Filter products that need to be synced
  const missingProducts = dbProducts.filter(product => !existingIds.has(product.stockNumber));
  console.log(`🔍 Missing products: ${missingProducts.length}`);
  
  if (missingProducts.length === 0) {
    console.log('✅ All products already synced!');
    return;
  }
  
  // Transform missing products
  const algoliaProducts: AlgoliaProduct[] = missingProducts.map(product => ({
    objectID: product.stockNumber,
    title: product.name,
    name: product.name,
    manufacturerName: product.manufacturer || 'Unknown',
    categoryName: product.category || 'Unknown',
    departmentNumber: product.departmentNumber?.toString() || '00',
    stockNumber: product.stockNumber,
    description: product.description || '',
    inventoryQuantity: product.inventoryQuantity || 0,
    inStock: (product.inventoryQuantity || 0) > 0,
    dropShippable: product.dropShippable || false,
    upc: product.upc || '',
    weight: product.weight || 0,
    tierPricing: {
      bronze: product.bronzePrice || 0,
      gold: product.goldPrice || 0,
      platinum: product.platinumPrice || 0,
    },
    caliber: product.caliber,
    capacity: product.capacity,
    barrelLength: product.barrelLength,
    finish: product.finish,
    frameSize: product.frameSize,
    actionType: product.actionType,
    sightType: product.sightType,
    tags: product.tags || [],
    newItem: product.newItem || false,
    internalSpecial: product.internalSpecial || false,
    retailPrice: product.retailPrice || 0,
    retailMap: product.retailMap,
    msrp: product.msrp || 0,
    dealerPrice: product.dealerPrice || 0,
    price: product.platinumPrice || 0,
    fflRequired: product.fflRequired || false,
    mpn: product.mpn || product.stockNumber,
  }));
  
  // Sync in aggressive batches
  const batchSize = 1000;
  const batches = Math.ceil(algoliaProducts.length / batchSize);
  
  console.log(`🔄 Processing ${batches} batches of ${batchSize} products...`);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, algoliaProducts.length);
    const batch = algoliaProducts.slice(start, end);
    
    console.log(`📦 Batch ${i + 1}/${batches}: Processing ${batch.length} products...`);
    
    try {
      await algoliaIndex.saveObjects(batch);
      console.log(`✅ Synced batch ${i + 1}/${batches}`);
    } catch (error) {
      console.error(`❌ Error syncing batch ${i + 1}:`, error);
    }
  }
  
  // Final count
  const { nbHits: finalCount } = await algoliaIndex.browse({ hitsPerPage: 1 });
  console.log(`🎉 Sync complete! Final count: ${finalCount} products`);
  
  if (finalCount >= 29834) {
    console.log('🎯 TARGET ACHIEVED: 100% sync complete!');
  } else {
    console.log(`📊 Progress: ${((finalCount / 29834) * 100).toFixed(1)}%`);
  }
}

forceCompleteSync().catch(console.error);