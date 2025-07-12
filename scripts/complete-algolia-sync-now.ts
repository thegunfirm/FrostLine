/**
 * Complete Algolia Sync Now
 * Sync all 29,834 products to Algolia immediately
 */

import { db } from '../server/db';
import axios from 'axios';

async function completeAlgoliaSync() {
  try {
    console.log('🚀 Starting complete Algolia sync...');
    
    // Get all products from database
    const result = await db.execute(`
      SELECT sku, name, description, manufacturer, department_number, 
             stock_quantity, in_stock, drop_shippable, upc_code, weight,
             price_bronze, price_gold, price_platinum, caliber, capacity,
             barrel_length, finish, frame_size, action_type, sight_type,
             tags, new_item, internal_special, price_msrp, price_map,
             requires_ffl, manufacturer_part_number
      FROM products 
      ORDER BY in_stock DESC, department_number, manufacturer, name
    `);
    
    console.log(`📊 Retrieved ${result.rows.length} products from database`);
    
    // Transform to Algolia format
    const algoliaProducts = result.rows.map((row: any) => ({
      objectID: row.sku,
      name: row.name,
      description: row.description || '',
      manufacturerName: row.manufacturer,
      categoryName: getCategoryName(row.department_number),
      departmentNumber: row.department_number,
      stockNumber: row.sku,
      inventoryQuantity: row.stock_quantity,
      inStock: row.in_stock,
      dropShippable: row.drop_shippable,
      upc: row.upc_code || '',
      weight: row.weight,
      tierPricing: {
        bronze: row.price_bronze,
        gold: row.price_gold,
        platinum: row.price_platinum
      },
      caliber: row.caliber,
      capacity: row.capacity,
      barrelLength: row.barrel_length,
      finish: row.finish,
      frameSize: row.frame_size,
      actionType: row.action_type,
      sightType: row.sight_type,
      tags: row.tags || [],
      newItem: row.new_item,
      internalSpecial: row.internal_special,
      retailPrice: row.price_msrp,
      retailMap: row.price_map,
      msrp: row.price_msrp,
      dealerPrice: row.price_gold,
      price: row.price_platinum,
      fflRequired: row.requires_ffl,
      mpn: row.manufacturer_part_number || ''
    }));
    
    console.log(`🔄 Syncing ${algoliaProducts.length} products to Algolia...`);
    
    // Batch upload to Algolia
    const batchSize = 100;
    let totalSynced = 0;
    
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
      
      totalSynced += batch.length;
      const progress = ((totalSynced / algoliaProducts.length) * 100).toFixed(1);
      console.log(`📈 Synced ${totalSynced}/${algoliaProducts.length} products (${progress}%)`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Complete sync finished');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test all categories
    const categories = [
      { name: 'Handguns', dept: '01' },
      { name: 'Long Guns', dept: '05' },
      { name: 'Optics', dept: '08' },
      { name: 'Ammunition', dept: '18' },
      { name: 'Parts', dept: '34' }
    ];
    
    for (const category of categories) {
      const testResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
        {
          query: '',
          filters: `departmentNumber:"${category.dept}"`,
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
      
      console.log(`🎯 ${category.name} (${category.dept}): ${testResponse.data.nbHits} results`);
      
      if (testResponse.data.nbHits > 0) {
        testResponse.data.hits.slice(0, 2).forEach((hit: any) => {
          console.log(`  - ${hit.objectID}: ${hit.name} (${hit.manufacturerName})`);
        });
      }
    }
    
    // Test browse for total count
    const browseResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
      { hitsPerPage: 1 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🏆 Total products indexed: ${browseResponse.data.nbHits}`);
    
  } catch (error) {
    console.error('❌ Complete sync failed:', error);
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
    case '06': return 'NFA Products';
    case '07': return 'Black Powder';
    case '09': return 'Accessories';
    case '10': return 'Magazines';
    case '11': return 'Accessories';
    case '12': return 'Accessories';
    case '13': return 'Accessories';
    case '14': return 'Accessories';
    case '15': return 'Reloading';
    case '17': return 'Accessories';
    case '20': return 'Accessories';
    case '21': return 'Accessories';
    case '22': return 'Airguns';
    case '24': return 'Magazines';
    case '25': return 'Accessories';
    case '26': return 'Accessories';
    case '27': return 'Accessories';
    case '30': return 'Accessories';
    case '31': return 'Accessories';
    case '35': return 'Accessories';
    case '41': return 'Long Guns';
    case '42': return 'Long Guns';
    case '43': return 'Long Guns';
    default: return 'Accessories';
  }
}

completeAlgoliaSync();