/**
 * Direct Algolia Populate
 * Use direct SQL to avoid Drizzle syntax issues
 */

import { db } from '../server/db';
import axios from 'axios';

async function directAlgoliaPopulate() {
  try {
    console.log('🎯 Direct Algolia populate starting...');
    
    // Get sample products using direct SQL
    const result = await db.execute(`
      SELECT sku, name, description, manufacturer, department_number, 
             stock_quantity, in_stock, drop_shippable, upc_code, weight,
             price_bronze, price_gold, price_platinum, caliber, capacity,
             barrel_length, finish, frame_size, action_type, sight_type,
             tags, new_item, internal_special, price_msrp, price_map,
             requires_ffl, manufacturer_part_number
      FROM products 
      WHERE department_number IN ('01', '05', '08', '18', '34')
      ORDER BY in_stock DESC, manufacturer, name
      LIMIT 250
    `);
    
    console.log(`📊 Retrieved ${result.rows.length} products`);
    
    if (result.rows.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
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
    
    console.log(`🚀 Syncing ${algoliaProducts.length} products to Algolia...`);
    
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
      
      console.log(`📈 Synced batch ${Math.floor(i / batchSize) + 1}`);
    }
    
    console.log('✅ Direct sync completed');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test searches by department
    const testDepts = [
      { name: 'Handguns', dept: '01' },
      { name: 'Long Guns', dept: '05' },
      { name: 'Optics', dept: '08' },
      { name: 'Ammunition', dept: '18' },
      { name: 'Parts', dept: '34' }
    ];
    
    for (const category of testDepts) {
      const testResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
        {
          query: '',
          filters: `departmentNumber:"${category.dept}"`,
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
      
      console.log(`🎯 ${category.name} (${category.dept}): ${testResponse.data.nbHits} results`);
      
      if (testResponse.data.nbHits > 0) {
        testResponse.data.hits.slice(0, 2).forEach((hit: any) => {
          console.log(`  - ${hit.objectID}: ${hit.name} (${hit.manufacturerName})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Direct populate failed:', error);
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

directAlgoliaPopulate();