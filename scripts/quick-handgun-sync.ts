/**
 * Quick Handgun Sync
 * Quickly sync just handgun products to make search work immediately
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

async function quickHandgunSync() {
  try {
    console.log('🔫 Quick handgun sync starting...');
    
    // Get handgun products from database
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.department_number, '01'))
      .limit(100);  // Sync first 100 handguns quickly
    
    console.log(`📊 Found ${handgunProducts.length} handgun products`);
    
    // Transform to Algolia format
    const algoliaProducts = handgunProducts.map(product => ({
      objectID: product.sku,
      name: product.name,
      description: product.description,
      manufacturerName: product.manufacturer,
      categoryName: 'Handguns',
      departmentNumber: '01',
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
    
    console.log(`🚀 Syncing ${algoliaProducts.length} handgun products...`);
    
    // Batch upload to Algolia
    const response = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`,
      {
        requests: algoliaProducts.map(product => ({
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
    
    console.log('✅ Handgun sync completed');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test search
    const testResponse = await axios.post(
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
    
    console.log(`🎯 Handgun search test: ${testResponse.data.nbHits} results`);
    
    if (testResponse.data.nbHits > 0) {
      console.log('🎉 Handgun search working!');
      testResponse.data.hits.slice(0, 3).forEach((hit: any) => {
        console.log(`  ${hit.objectID} - ${hit.name} - ${hit.manufacturerName}`);
      });
    } else {
      console.log('⚠️ No handgun results found');
    }
    
  } catch (error) {
    console.error('❌ Quick handgun sync failed:', error);
    throw error;
  }
}

quickHandgunSync();