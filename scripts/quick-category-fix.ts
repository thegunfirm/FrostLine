/**
 * Quick Category Fix
 * Fast sync of products by category to get search working immediately
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

async function quickCategoryFix() {
  try {
    console.log('🏃 Quick category fix starting...');
    
    // Get products by department
    const departments = ['01', '05', '08', '18', '34'];
    const allProducts = [];
    
    for (const dept of departments) {
      const deptProducts = await db.select()
        .from(products)
        .where(eq(products.department_number, dept))
        .limit(50);
      
      console.log(`📦 Department ${dept}: ${deptProducts.length} products`);
      allProducts.push(...deptProducts);
    }
    
    console.log(`📊 Total products to sync: ${allProducts.length}`);
    
    // Transform to Algolia format
    const algoliaProducts = allProducts.map(product => ({
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
    
    console.log(`🚀 Syncing ${algoliaProducts.length} products...`);
    
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
    
    console.log('✅ Quick sync completed');
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test searches
    const testCategories = [
      { name: 'Handguns', dept: '01' },
      { name: 'Long Guns', dept: '05' },
      { name: 'Optics', dept: '08' },
      { name: 'Ammunition', dept: '18' },
      { name: 'Parts', dept: '34' }
    ];
    
    for (const category of testCategories) {
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
    }
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
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

quickCategoryFix();