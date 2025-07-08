/**
 * Fix Remaining Handgun Accessories
 * Move remaining accessories out of Handguns category
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function fixRemainingHandgunAccessories() {
  console.log('🔧 Starting final handgun accessories cleanup...');
  
  try {
    // Get all Department 01 products still in Handguns category
    const handgunProducts = await db
      .select()
      .from(products)
      .where(and(
        eq(products.departmentNumber, '01'),
        eq(products.category, 'Handguns')
      ));
    
    console.log(`📦 Found ${handgunProducts.length} products in Handguns category`);
    
    let accessoriesFixed = 0;
    let partsFixed = 0;
    let magazinesFixed = 0;
    
    // Process each product
    for (const product of handgunProducts) {
      const name = product.name.toLowerCase();
      let newCategory = product.category;
      
      // Comprehensive accessory detection
      if (name.includes('sight') || name.includes('scope') || name.includes('optic') ||
          name.includes('mount') || name.includes('rail') || name.includes('light') ||
          name.includes('laser') || name.includes('bipod') || name.includes('sling') ||
          name.includes('holster') || name.includes('case') || name.includes('grip') ||
          name.includes('accessory') || name.includes('tactical') || name.includes('picatinny') ||
          name.includes('weaver') || name.includes('flashlight') || name.includes('illuminator') ||
          name.includes('insurgent') || name.includes('deluxe') || name.includes('vrscry') ||
          name.includes('versacarry') || name.includes('iwb') || name.includes('owb') ||
          name.includes('concealment') || name.includes('retention') || name.includes('kydex')) {
        newCategory = 'Accessories';
        accessoriesFixed++;
      }
      // Comprehensive parts detection
      else if (name.includes('spring') || name.includes('pin') || name.includes('screw') ||
               name.includes('buffer') || name.includes('tube') || name.includes('kit') ||
               name.includes('replacement') || name.includes('repair') || name.includes('maintenance') ||
               name.includes('tool') || name.includes('wrench') || name.includes('driver') ||
               name.includes('punch') || name.includes('jig') || name.includes('fixture') ||
               name.includes('assembly') || name.includes('component') || name.includes('hardware')) {
        newCategory = 'Parts';
        partsFixed++;
      }
      // Magazine detection
      else if (name.includes('magazine') || name.includes(' mag ') || name.includes('clip') ||
               name.includes('mag ext') || name.includes('mag well') || name.includes('mag pouch') ||
               name.includes('mag release') || name.includes('mag catch')) {
        newCategory = 'Magazines';
        magazinesFixed++;
      }
      
      // Update if category changed
      if (newCategory !== product.category) {
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
        
        console.log(`🔄 ${product.name} → ${newCategory}`);
      }
    }
    
    console.log('✅ Final handgun accessories cleanup completed:');
    console.log(`  - Accessories moved: ${accessoriesFixed}`);
    console.log(`  - Parts moved: ${partsFixed}`);
    console.log(`  - Magazines moved: ${magazinesFixed}`);
    
    // Get final counts
    const finalCounts = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    const categoryCounts = finalCounts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Final Department 01 distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} products`);
    });
    
  } catch (error) {
    console.error('💥 Final cleanup failed:', error);
    throw error;
  }
}

// Run the fix
fixRemainingHandgunAccessories()
  .then(() => {
    console.log('✅ Final handgun accessories cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Final cleanup failed:', error);
    process.exit(1);
  });