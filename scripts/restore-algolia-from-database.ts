/**
 * Restore Algolia Index from Database
 * This script adds missing products without overwriting existing ones
 */

import { db } from '../server/db';
import axios from 'axios';

async function restoreAlgoliaFromDatabase() {
  try {
    console.log('🔄 Restoring Algolia index from database...');
    
    // First, get current Algolia index count
    const currentResponse = await axios.post(
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
    
    console.log(`📊 Current Algolia products: ${currentResponse.data.nbHits}`);
    
    // Get existing product IDs from Algolia to avoid duplicates
    const existingIds = new Set();
    let cursor = null;
    
    console.log('🔍 Getting existing product IDs from Algolia...');
    do {
      const browseParams = {
        hitsPerPage: 1000,
        attributesToRetrieve: ['objectID']
      };
      
      if (cursor) {
        browseParams.cursor = cursor;
      }
      
      const browseResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
        browseParams,
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      browseResponse.data.hits.forEach(hit => {
        existingIds.add(hit.objectID);
      });
      
      cursor = browseResponse.data.cursor;
      console.log(`📝 Found ${existingIds.size} existing products...`);
      
    } while (cursor);
    
    console.log(`✅ Total existing products in Algolia: ${existingIds.size}`);
    
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
    
    console.log(`📦 Database products: ${result.rows.length}`);
    
    // Filter out products that already exist in Algolia
    const newProducts = result.rows.filter(row => !existingIds.has(row.sku));
    console.log(`🆕 New products to add: ${newProducts.length}`);
    
    if (newProducts.length === 0) {
      console.log('✅ All products already exist in Algolia');
      return;
    }
    
    // Transform new products to Algolia format
    const algoliaProducts = newProducts.map((row: any) => ({
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
    
    console.log(`⬆️ Adding ${algoliaProducts.length} new products to Algolia...`);
    
    // Add new products without overwriting existing ones
    const batchSize = 100;
    let totalAdded = 0;
    
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`,
        {
          requests: batch.map(product => ({
            action: 'addObject',  // Use addObject instead of updateObject
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
      
      totalAdded += batch.length;
      const progress = ((totalAdded / algoliaProducts.length) * 100).toFixed(1);
      console.log(`➕ Added ${totalAdded}/${algoliaProducts.length} products (${progress}%)`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Restore completed');
    
    // Check final count
    const finalResponse = await axios.post(
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
    
    console.log(`🏆 Final Algolia products: ${finalResponse.data.nbHits}`);
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
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

restoreAlgoliaFromDatabase();