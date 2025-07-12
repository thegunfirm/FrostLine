/**
 * Targeted Missing Products Sync
 * Identifies exactly which products are missing from Algolia and syncs only those
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import axios from 'axios';

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

async function getAlgoliaProductIds(): Promise<Set<string>> {
  console.log('🔍 Fetching all product IDs from Algolia...');
  const algoliaIds = new Set<string>();
  
  try {
    const response = await axios.post(
      `https://QWHWU806V0-dsn.algolia.net/1/indexes/products/browse`,
      {
        attributesToRetrieve: ['objectID'],
        hitsPerPage: 1000
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );

    let hits = response.data.hits;
    let cursor = response.data.cursor;

    hits.forEach((hit: any) => {
      algoliaIds.add(hit.objectID);
    });

    // Continue browsing if there are more results
    while (cursor) {
      const nextResponse = await axios.post(
        `https://QWHWU806V0-dsn.algolia.net/1/indexes/products/browse`,
        {
          attributesToRetrieve: ['objectID'],
          cursor: cursor,
          hitsPerPage: 1000
        },
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );

      nextResponse.data.hits.forEach((hit: any) => {
        algoliaIds.add(hit.objectID);
      });

      cursor = nextResponse.data.cursor;
    }

    console.log(`📋 Found ${algoliaIds.size} products in Algolia`);
    return algoliaIds;
  } catch (error) {
    console.error('❌ Error fetching Algolia IDs:', error);
    throw error;
  }
}

async function getMissingProducts(algoliaIds: Set<string>) {
  console.log('🔍 Identifying missing products...');
  
  const allProducts = await db.select().from(products);
  const missingProducts = allProducts.filter(product => !algoliaIds.has(product.sku!));
  
  console.log(`📊 Database: ${allProducts.length} products`);
  console.log(`📊 Algolia: ${algoliaIds.size} products`);
  console.log(`📊 Missing: ${missingProducts.length} products`);
  
  return missingProducts;
}

function transformProductForAlgolia(product: any): AlgoliaProduct {
  return {
    objectID: product.sku,
    name: product.name,
    manufacturerName: product.manufacturer || 'Unknown',
    categoryName: product.category,
    departmentNumber: product.departmentNumber || '',
    stockNumber: product.sku,
    description: product.description || '',
    inventoryQuantity: product.stockQuantity || 0,
    inStock: product.inStock || false,
    dropShippable: product.dropShippable || false,
    upc: product.upcCode || '',
    weight: parseFloat(product.weight) || 0,
    tierPricing: {
      bronze: parseFloat(product.priceBronze) || 0,
      gold: parseFloat(product.priceGold) || 0,
      platinum: parseFloat(product.pricePlatinum) || 0
    },
    caliber: product.caliber,
    capacity: product.capacity,
    barrelLength: product.barrelLength,
    finish: product.finish,
    frameSize: product.frameSize,
    actionType: product.actionType,
    sightType: product.sightType,
    tags: Array.isArray(product.tags) ? product.tags : [],
    newItem: product.newItem || false,
    internalSpecial: product.internalSpecial || false,
    retailPrice: parseFloat(product.priceBronze) || 0,
    retailMap: product.priceMAP ? parseFloat(product.priceMAP) : null,
    msrp: parseFloat(product.priceMSRP) || 0,
    dealerPrice: parseFloat(product.priceWholesale) || 0,
    price: parseFloat(product.pricePlatinum) || 0,
    fflRequired: product.requiresFFL || false,
    mpn: product.manufacturerPartNumber || ''
  };
}

async function syncMissingProducts(missingProducts: any[]) {
  console.log(`🚀 Syncing ${missingProducts.length} missing products...`);
  
  const batchSize = 500;
  const batches = [];
  
  for (let i = 0; i < missingProducts.length; i += batchSize) {
    batches.push(missingProducts.slice(i, i + batchSize));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const algoliaProducts = batch.map(transformProductForAlgolia);
    
    try {
      await axios.post(
        `https://QWHWU806V0-dsn.algolia.net/1/indexes/products/batch`,
        {
          requests: algoliaProducts.map(product => ({
            action: 'addObject',
            body: product
          }))
        },
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Synced batch ${i + 1}/${batches.length} (${batch.length} products)`);
    } catch (error) {
      console.error(`❌ Error syncing batch ${i + 1}:`, error);
    }
  }
}

async function targetedMissingSync() {
  try {
    console.log('🎯 Starting Targeted Missing Products Sync...');
    
    const algoliaIds = await getAlgoliaProductIds();
    const missingProducts = await getMissingProducts(algoliaIds);
    
    if (missingProducts.length === 0) {
      console.log('🎉 No missing products! Sync is complete!');
      return;
    }
    
    // Show breakdown by category
    const categoryBreakdown = missingProducts.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Missing products by category:');
    Object.entries(categoryBreakdown).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
    
    await syncMissingProducts(missingProducts);
    
    console.log('🎉 Targeted sync complete!');
    
  } catch (error) {
    console.error('❌ Targeted sync failed:', error);
    process.exit(1);
  }
}

targetedMissingSync();