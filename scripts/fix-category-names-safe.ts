/**
 * Fix Category Names in Algolia - Safe Update
 * Updates only the categoryName field without deleting any products
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import axios from 'axios';

// Map department numbers to category names
function getCategoryName(departmentNumber: string): string {
  switch(departmentNumber) {
    case '01': return 'Handguns';
    case '02': return 'Used Handguns';
    case '03': return 'Used Long Guns';
    case '04': return 'Tasers';
    case '05': return 'Long Guns';
    case '06': return 'NFA Products';
    case '07': return 'Black Powder';
    case '08': return 'Optics';
    case '09': return 'Optical Accessories';
    case '10': return 'Magazines';
    case '11': return 'Grips, Pads, Stocks, Bipods';
    case '12': return 'Soft Gun Cases, Packs, Bags';
    case '13': return 'Misc. Accessories';
    case '14': return 'Holsters & Pouches';
    case '15': return 'Reloading Equipment';
    case '16': return 'Black Powder Accessories';
    case '17': return 'Closeout Accessories';
    case '18': return 'Ammunition';
    case '19': return 'Survival & Camping Supplies';
    case '20': return 'Lights, Lasers & Batteries';
    case '21': return 'Cleaning Equipment';
    case '22': return 'Airguns';
    case '23': return 'Knives & Tools';
    case '24': return 'High Capacity Magazines';
    case '25': return 'Safes & Security';
    case '26': return 'Safety & Protection';
    case '27': return 'Non-Lethal Defense';
    case '28': return 'Binoculars';
    case '29': return 'Spotting Scopes';
    case '30': return 'Sights';
    case '31': return 'Optical Accessories';
    case '32': return 'Barrels, Choke Tubes & Muzzle Devices';
    case '33': return 'Clothing';
    case '34': return 'Parts';
    case '35': return 'Slings & Swivels';
    case '36': return 'Electronics';
    case '37': return 'Not Used';
    case '38': return 'Books, Software & DVD\'s';
    case '39': return 'Targets';
    case '40': return 'Hard Gun Cases';
    case '41': return 'Upper Receivers & Conversion Kits';
    case '42': return 'SBR Barrels & Upper Receivers';
    case '43': return 'Upper Receivers & Conversion Kits - High Capacity';
    default: return 'Accessories';
  }
}

// Sub-categorize Long Guns
function getSubCategory(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('shotgun') || nameLower.includes('12ga') || nameLower.includes('20ga') || 
      nameLower.includes('410') || nameLower.includes('16ga') || nameLower.includes('28ga')) {
    return 'Shotguns';
  }
  
  return 'Rifles';
}

async function fixCategoryNamesSafe() {
  try {
    console.log('🔧 Fixing category names in Algolia safely...');
    
    // Test with a small batch first
    const testBatch = await db.select().from(products).limit(5);
    console.log(`🧪 Testing with ${testBatch.length} products first...`);
    
    for (const product of testBatch) {
      const categoryName = getCategoryName(product.departmentNumber);
      const finalCategoryName = categoryName === 'Long Guns' ? 
        getSubCategory(product.name) : categoryName;
      
      // Use saveObject to update individual record
      const updateData = {
        objectID: product.stockNumber,
        categoryName: finalCategoryName
      };
      
      const response = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`,
        {
          requests: [{
            action: 'partialUpdateObject',
            body: updateData
          }]
        },
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        console.log(`✅ Updated ${product.stockNumber} -> ${finalCategoryName}`);
      } else {
        console.error(`❌ Failed to update ${product.stockNumber}:`, response.data);
      }
    }
    
    // Test the results
    const verifyResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`,
      { 
        query: '',
        filters: 'categoryName:"Rifles"',
        hitsPerPage: 1
      },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Test verification: ${verifyResponse.data.nbHits} Rifles found after test batch`);
    
  } catch (error) {
    console.error('❌ Category name fix failed:', error);
  }
}

fixCategoryNamesSafe();