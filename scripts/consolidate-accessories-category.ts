/**
 * Consolidate Accessories Category
 * Updates all accessory-related departments to use unified "Accessories" category
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { inArray } from 'drizzle-orm';

async function consolidateAccessoriesCategory() {
  console.log('🔄 Consolidating Accessories Category...');
  
  try {
    // Accessory departments based on RSR department structure
    const accessoryDepartments = [
      '09', // Optical Accessories
      '11', // Grips, Pads, Stocks, Bipods
      '12', // Soft Gun Cases, Packs, Bags
      '13', // Misc. Accessories
      '14', // Holsters & Pouches
      '17', // Closeout Accessories
      '20', // Lights, Lasers & Batteries
      '21', // Cleaning Equipment
      '25', // Safes & Security
      '26', // Safety & Protection
      '27', // Non-Lethal Defense
      '30', // Sights
      '31', // Optical Accessories
      '35', // Slings & Swivels
    ];

    // Update products in accessory departments to use "Accessories" category
    const updateResult = await db.update(products)
      .set({ category: 'Accessories' })
      .where(inArray(products.departmentNumber, accessoryDepartments));

    console.log(`✅ Updated products to use "Accessories" category`);

    // Count updated products
    const accessoryCount = await db.select()
      .from(products)
      .where(inArray(products.departmentNumber, accessoryDepartments));

    console.log(`📊 Total accessories after consolidation: ${accessoryCount.length}`);
    console.log(`🎯 Consolidation complete - all accessory departments now use "Accessories" category`);
    
  } catch (error) {
    console.error('❌ Error consolidating accessories category:', error);
    throw error;
  }
}

// Execute the consolidation
consolidateAccessoriesCategory()
  .then(() => {
    console.log('🎉 Accessories category consolidation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Consolidation failed:', error);
    process.exit(1);
  });