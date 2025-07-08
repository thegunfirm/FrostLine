/**
 * Sync Algolia with Current Database Data
 * Updates Algolia index with authentic RSR department numbers that are currently in the database
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, isNotNull } from 'drizzle-orm';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const ALGOLIA_INDEX_NAME = 'products';

interface AlgoliaProduct {
  objectID: string;
  name: string;
  description: string;
  category: string;
  departmentNumber: string;
  manufacturer: string;
  manufacturerName: string;
  sku: string;
  inStock: boolean;
  quantity: number;
  retailPrice: number;
  dealerPrice: number;
  msrp: number;
  retailMap: number;
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  requiresFFL: boolean;
  tags: string[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync Algolia with products that have department numbers
 */
async function syncAlgoliaWithCurrentData() {
  console.log('🔄 Starting Algolia sync with current department data...');
  
  try {
    // Get all products that have department numbers
    const productsWithDepartments = await db
      .select()
      .from(products)
      .where(isNotNull(products.departmentNumber));
    
    console.log(`📊 Found ${productsWithDepartments.length} products with department numbers`);
    
    // Count by department
    const dept01Count = productsWithDepartments.filter(p => p.departmentNumber === '01').length;
    const dept05Count = productsWithDepartments.filter(p => p.departmentNumber === '05').length;
    const otherCount = productsWithDepartments.length - dept01Count - dept05Count;
    
    console.log(`  - Department 01 (Handguns): ${dept01Count} products`);
    console.log(`  - Department 05 (Long Guns): ${dept05Count} products`);
    console.log(`  - Other Departments: ${otherCount} products`);
    
    // Prepare Algolia records
    const algoliaRecords: AlgoliaProduct[] = productsWithDepartments.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      departmentNumber: product.departmentNumber || '',
      manufacturer: product.manufacturer,
      manufacturerName: product.manufacturer,
      sku: product.sku,
      inStock: product.inStock,
      quantity: product.stockQuantity || 0,
      retailPrice: parseFloat(product.retailPrice || '0'),
      dealerPrice: parseFloat(product.dealerPrice || '0'),
      msrp: parseFloat(product.msrp || '0'),
      retailMap: parseFloat(product.retailMap || '0'),
      tierPricing: {
        bronze: parseFloat(product.priceBronze || '0'),
        gold: parseFloat(product.priceGold || '0'),
        platinum: parseFloat(product.pricePlatinum || '0'),
      },
      requiresFFL: product.requiresFFL || false,
      tags: product.tags || [],
      imageUrl: product.imageUrl || null,
      createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
    }));
    
    // Send to Algolia using HTTP API
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/batch`;
    
    console.log('🚀 Sending to Algolia...');
    
    const response = await fetch(algoliaUrl, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: algoliaRecords.map(record => ({
          action: 'updateObject',
          body: record,
        })),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Algolia API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Algolia sync completed successfully');
    console.log(`📦 Updated ${algoliaRecords.length} products in Algolia`);
    console.log(`🔍 Department 01 products now searchable: ${dept01Count}`);
    console.log(`🔍 Department 05 products now searchable: ${dept05Count}`);
    
  } catch (error) {
    console.error('💥 Algolia sync failed:', error);
    throw error;
  }
}

// Run the sync
syncAlgoliaWithCurrentData()
  .then(() => {
    console.log('✅ Algolia sync with current data completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Algolia sync failed:', error);
    process.exit(1);
  });