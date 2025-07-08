/**
 * Fix Department 01 Categorization
 * Properly categorizes parts, magazines, and accessories in Department 01
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, like, or } from 'drizzle-orm';

/**
 * Fix categorization for Department 01 products
 */
async function fixDept01Categorization() {
  console.log('🔧 Starting Department 01 categorization fix...');
  
  try {
    // Get all Department 01 products
    const dept01Products = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    console.log(`📊 Found ${dept01Products.length} Department 01 products`);
    
    let partsFixed = 0;
    let magazinesFixed = 0;
    let accessoriesFixed = 0;
    let handgunsKept = 0;
    
    for (const product of dept01Products) {
      const name = product.name.toLowerCase();
      let newCategory = product.category;
      
      // Identify parts and components
      if (name.includes('frame') || name.includes('lower') || name.includes('upper') || 
          name.includes('slide') || name.includes('barrel') || name.includes('receiver')) {
        newCategory = 'Parts';
        partsFixed++;
      }
      // Identify magazines
      else if (name.includes('magazine') || name.includes(' mag ') || name.includes('clip') ||
               name.includes('mag pouch') || name.includes('mag ext')) {
        newCategory = 'Magazines';
        magazinesFixed++;
      }
      // Identify accessories
      else if (name.includes('holster') || name.includes('case') || name.includes('sight') ||
               name.includes('grip') || name.includes('trigger') || name.includes('mount')) {
        newCategory = 'Accessories';
        accessoriesFixed++;
      }
      // Keep as handguns (actual firearms)
      else {
        handgunsKept++;
      }
      
      // Update if category changed
      if (newCategory !== product.category) {
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
      }
    }
    
    console.log('✅ Department 01 categorization fixed:');
    console.log(`  - Actual handguns: ${handgunsKept} products`);
    console.log(`  - Parts moved: ${partsFixed} products`);
    console.log(`  - Magazines moved: ${magazinesFixed} products`);
    console.log(`  - Accessories moved: ${accessoriesFixed} products`);
    
    // Verify the changes
    const categoryStats = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    const categoryCounts = categoryStats.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Updated Department 01 distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} products`);
    });
    
  } catch (error) {
    console.error('💥 Categorization fix failed:', error);
    throw error;
  }
}

// Run the fix
fixDept01Categorization()
  .then(() => {
    console.log('✅ Department 01 categorization fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Department 01 categorization fix failed:', error);
    process.exit(1);
  });