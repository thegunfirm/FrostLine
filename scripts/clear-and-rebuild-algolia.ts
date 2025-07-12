/**
 * Clear and Rebuild Algolia Index
 * Completely clears the Algolia index and rebuilds it with fresh data from the database
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import axios from 'axios';

interface AlgoliaProduct {
  objectID: string;
  name: string;
  description: string;
  manufacturerName: string;
  categoryName: string;
  departmentNumber: string;
  stockNumber: string;
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

async function clearAndRebuildAlgolia() {
  try {
    console.log('🗑️ Clearing Algolia index...');
    
    // Clear the index
    await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/clear`,
      {},
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Algolia index cleared');
    
    // Wait for clearing to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📊 Fetching products from database...');
    
    // Get all products from database
    const dbProducts = await db.select().from(products);
    
    console.log(`📦 Found ${dbProducts.length} products in database`);
    
    // Transform database products to Algolia format
    const algoliaProducts: AlgoliaProduct[] = dbProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: product.category_name || 'Uncategorized',
      departmentNumber: product.department_number || '00',
      stockNumber: product.sku,
      inventoryQuantity: product.inventory_quantity,
      inStock: product.in_stock,
      dropShippable: product.drop_shippable,
      upc: product.upc || '',
      weight: product.weight,
      tierPricing: {
        bronze: product.bronze_price,
        gold: product.gold_price,
        platinum: product.platinum_price
      },
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrel_length,
      finish: product.finish,
      frameSize: product.frame_size,
      actionType: product.action_type,
      sightType: product.sight_type,
      tags: product.tags || [],
      newItem: product.new_item,
      internalSpecial: product.internal_special,
      retailPrice: product.retail_price,
      retailMap: product.retail_map,
      msrp: product.msrp,
      dealerPrice: product.dealer_price,
      price: product.platinum_price, // Use platinum as primary price
      fflRequired: product.ffl_required,
      mpn: product.mpn || ''
    }));
    
    console.log(`🚀 Indexing ${algoliaProducts.length} products to Algolia...`);
    
    // Index products in batches
    const batchSize = 1000;
    let indexed = 0;
    
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`,
        {
          requests: batch.map(product => ({
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
      
      indexed += batch.length;
      console.log(`📈 Indexed ${indexed} / ${algoliaProducts.length} products`);
    }
    
    console.log('✅ Algolia index rebuilt successfully!');
    
    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Testing search functionality...');
    
    // Test search
    const testResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      {
        query: 'glock',
        hitsPerPage: 5
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🎯 Search test: ${testResponse.data.nbHits} results for "glock"`);
    
    // Test handgun filtering
    const handgunResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
      {
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 5
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🎯 Handgun filter test: ${handgunResponse.data.nbHits} results`);
    
    if (testResponse.data.nbHits > 0 && handgunResponse.data.nbHits > 0) {
      console.log('🎉 Algolia search and filtering working correctly!');
    } else {
      console.log('⚠️ There may still be search issues');
    }
    
  } catch (error) {
    console.error('❌ Error rebuilding Algolia index:', error);
    throw error;
  }
}

clearAndRebuildAlgolia();