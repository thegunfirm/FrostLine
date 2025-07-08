/**
 * Fix Missing Department Numbers
 * Updates the 3 products without department numbers
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function fixMissingDepartments() {
  console.log('🔧 Fixing missing department numbers...');
  
  try {
    // Get products without department numbers
    const productsWithoutDept = await db.select()
      .from(products)
      .where(isNull(products.departmentNumber));
    
    console.log(`Found ${productsWithoutDept.length} products without department numbers`);
    
    // Map sample products to appropriate departments
    const departmentMapping = {
      'MAGPUL-PMAG': '03', // Magazines
      'FEDERAL-XM193': '02', // Ammunition
      'HORNADY-9MM': '02'   // Ammunition
    };
    
    for (const product of productsWithoutDept) {
      const dept = departmentMapping[product.sku as keyof typeof departmentMapping];
      
      if (dept) {
        await db.update(products)
          .set({ departmentNumber: dept })
          .where(eq(products.id, product.id));
        
        console.log(`✅ Updated ${product.sku} to department ${dept}`);
      } else {
        // Default assignment based on category
        let defaultDept = '99'; // Miscellaneous
        
        if (product.category === 'Ammunition') defaultDept = '02';
        else if (product.category === 'Magazines') defaultDept = '03';
        else if (product.category === 'Accessories') defaultDept = '17';
        
        await db.update(products)
          .set({ departmentNumber: defaultDept })
          .where(eq(products.id, product.id));
        
        console.log(`✅ Updated ${product.sku} to default department ${defaultDept}`);
      }
    }
    
    console.log('✅ All missing department numbers fixed');
    
  } catch (error) {
    console.error('❌ Failed to fix missing departments:', error);
  }
}

// Run the fix
fixMissingDepartments();