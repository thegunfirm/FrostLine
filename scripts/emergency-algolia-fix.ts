/**
 * Emergency Algolia Fix
 * Fast sync of essential products to get search working immediately
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { inArray } from 'drizzle-orm';
import axios from 'axios';

async function emergencyAlgoliaFix() {
  try {
    console.log('🚨 Emergency Algolia fix starting...');
    
    // Get a sample of products from each main category
    const sampleProducts = await db.select()
      .from(products)
      .where(inArray(products.department_number, ['01', '05', '08', '18', '34']))
      .limit(500);
    
    console.log(`📊 Found ${sampleProducts.length} sample products`);
    
    if (sampleProducts.length === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    // Transform to Algolia format
    const algoliaProducts = sampleProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: getCategoryName(product.department_number),
      departmentNumber: product.department_number,
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
      price: product.platinum_price,
      fflRequired: product.ffl_required,
      mpn: product.mpn || ''
    }));
    
    console.log(`🚀 Emergency syncing ${algoliaProducts.length} products...`);
    
    // Batch upload to Algolia
    const batchSize = 100;
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`,
        {
          requests: batch.map(product => ({
            action: 'updateObject',
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
      
      console.log(`📈 Synced batch ${i / batchSize + 1}`);
    }
    
    console.log('✅ Emergency sync completed');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test searches
    const categories = ['Handguns', 'Long Guns', 'Optics', 'Ammunition', 'Parts'];
    for (const category of categories) {
      const testResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
        {
          query: '',
          filters: `categoryName:"${category}"`,
          hitsPerPage: 3
        },
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`🎯 ${category}: ${testResponse.data.nbHits} results`);
    }
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    throw error;
  }
}

function getCategoryName(departmentNumber: string): string {
  switch (departmentNumber) {
    case '01': return 'Handguns';
    case '05': return 'Long Guns';
    case '08': return 'Optics';
    case '18': return 'Ammunition';
    case '34': return 'Parts';
    default: return 'Accessories';
  }
}

emergencyAlgoliaFix();