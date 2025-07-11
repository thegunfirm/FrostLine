/**
 * Complete Algolia Indexing - Achieve 100% Coverage
 * Ensures all 29,834 RSR products are indexed in Algolia with comprehensive filter data
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, isNull, or } from 'drizzle-orm';

// Algolia configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'QWHWU806V0';
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const ALGOLIA_INDEX_NAME = 'products';

if (!ALGOLIA_ADMIN_API_KEY) {
  throw new Error('ALGOLIA_ADMIN_API_KEY environment variable is required');
}

interface AlgoliaProduct {
  objectID: string;
  name: string;
  manufacturerName: string;
  categoryName: string;
  departmentNumber: number;
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
}

async function syncBatchToAlgolia(batch: AlgoliaProduct[]) {
  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`;
  
  const body = {
    requests: batch.map(product => ({
      action: 'addObject',
      body: product
    }))
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Algolia sync failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function getAllProductsFromDatabase() {
  console.log('📊 Fetching all products from database...');
  
  const allProducts = await db.select().from(products);
  
  console.log(`📊 Found ${allProducts.length} products in database`);
  return allProducts;
}

async function transformProductsForAlgolia(dbProducts: any[]) {
  console.log('🔄 Transforming products for Algolia...');
  
  const algoliaProducts: AlgoliaProduct[] = dbProducts.map(product => {
    // Parse tags from string
    let tags: string[] = [];
    if (product.tags && typeof product.tags === 'string') {
      try {
        tags = JSON.parse(product.tags);
      } catch (e) {
        tags = product.tags.split(',').map((tag: string) => tag.trim());
      }
    } else if (Array.isArray(product.tags)) {
      tags = product.tags;
    }

    // Parse tier pricing
    let tierPricing = {
      bronze: product.msrp || 0,
      gold: product.retailMap || product.msrp || 0,
      platinum: product.dealerPrice || 0
    };

    if (product.tierPricing && typeof product.tierPricing === 'string') {
      try {
        const parsed = JSON.parse(product.tierPricing);
        tierPricing = {
          bronze: parsed.bronze || product.msrp || 0,
          gold: parsed.gold || product.retailMap || product.msrp || 0,
          platinum: parsed.platinum || product.dealerPrice || 0
        };
      } catch (e) {
        // Use fallback values
      }
    }

    return {
      objectID: product.stockNumber,
      name: product.name,
      manufacturerName: product.manufacturerName,
      categoryName: product.categoryName,
      departmentNumber: product.departmentNumber,
      stockNumber: product.stockNumber,
      description: product.description || '',
      inventoryQuantity: product.inventoryQuantity || 0,
      inStock: product.inventoryQuantity > 0,
      dropShippable: product.dropShippable || false,
      upc: product.upc || '',
      weight: product.weight || 0,
      tierPricing,
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrelLength,
      finish: product.finish,
      frameSize: product.frameSize,
      actionType: product.actionType,
      sightType: product.sightType,
      tags,
      newItem: product.newItem || false,
      internalSpecial: product.internalSpecial || false,
      retailPrice: product.retailPrice || product.msrp || 0,
      retailMap: product.retailMap,
      msrp: product.msrp || 0,
      dealerPrice: product.dealerPrice || 0
    };
  });

  console.log(`🔄 Transformed ${algoliaProducts.length} products for Algolia`);
  return algoliaProducts;
}

async function completeAlgoliaIndexing() {
  console.log('🚀 Starting Complete Algolia Indexing Process...');
  
  try {
    // Step 1: Get all products from database
    const dbProducts = await getAllProductsFromDatabase();
    
    // Step 2: Transform for Algolia
    const algoliaProducts = await transformProductsForAlgolia(dbProducts);
    
    // Step 3: Sync in batches
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(algoliaProducts.length / BATCH_SIZE);
    
    console.log(`📦 Processing ${algoliaProducts.length} products in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, algoliaProducts.length);
      const batch = algoliaProducts.slice(start, end);
      
      console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${start + 1}-${end})...`);
      
      await syncBatchToAlgolia(batch);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Complete Algolia Indexing Successful!');
    console.log(`📊 Total products indexed: ${algoliaProducts.length}`);
    console.log(`📊 Coverage: ${((algoliaProducts.length / dbProducts.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Complete Algolia Indexing Error:', error);
    throw error;
  }
}

// Run the complete indexing
if (import.meta.main) {
  completeAlgoliaIndexing()
    .then(() => {
      console.log('🎉 Complete Algolia Indexing Process Completed Successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Complete Algolia Indexing Process Failed:', error);
      process.exit(1);
    });
}