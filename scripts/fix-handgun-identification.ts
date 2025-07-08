/**
 * Fix Handgun Identification - Identify ACTUAL Handguns vs Everything Else
 * RSR Department 01 contains many non-handgun products, so we need to identify real handguns
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixHandgunIdentification() {
  console.log('🔫 Starting actual handgun identification...');
  
  try {
    // Get all Department 01 products
    const dept01Products = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    console.log(`📦 Processing ${dept01Products.length} Department 01 products...`);
    
    let actualHandguns = 0;
    let movedToAccessories = 0;
    let movedToParts = 0;
    let movedToMagazines = 0;
    let movedToOther = 0;
    
    for (const product of dept01Products) {
      const name = product.name.toLowerCase();
      let newCategory = 'Handguns'; // Default to handgun
      
      // First, identify clear NON-handgun products
      if (
        // Hunting/Taxidermy displays
        name.includes('skull hooker') || name.includes('trophy') || name.includes('mount') ||
        name.includes('hanger') || name.includes('display') || name.includes('hook') ||
        
        // Scope rings and mounts
        name.includes('ring') || name.includes('scope mount') || name.includes('base') ||
        name.includes('30mm') || name.includes('1"') || name.includes('weaver') ||
        
        // Clear accessories
        name.includes('sight') || name.includes('optic') || name.includes('laser') ||
        name.includes('light') || name.includes('holster') || name.includes('case') ||
        name.includes('sling') || name.includes('bipod') || name.includes('tactical') ||
        
        // Clear parts
        name.includes('spring') || name.includes('pin') || name.includes('screw') ||
        name.includes('kit') || name.includes('tool') || name.includes('buffer') ||
        name.includes('tube') || name.includes('assembly') || name.includes('replacement') ||
        
        // Magazines
        name.includes('magazine') || name.includes(' mag ') || name.includes('clip') ||
        
        // Other non-firearms
        name.includes('ammo') || name.includes('brass') || name.includes('reloading') ||
        name.includes('target') || name.includes('patch') || name.includes('cleaning')
      ) {
        // Categorize non-handgun products
        if (name.includes('magazine') || name.includes(' mag ') || name.includes('clip')) {
          newCategory = 'Magazines';
          movedToMagazines++;
        } else if (name.includes('spring') || name.includes('pin') || name.includes('screw') ||
                   name.includes('kit') || name.includes('tool') || name.includes('buffer') ||
                   name.includes('tube') || name.includes('assembly') || name.includes('replacement')) {
          newCategory = 'Parts';
          movedToParts++;
        } else if (name.includes('sight') || name.includes('optic') || name.includes('laser') ||
                   name.includes('light') || name.includes('holster') || name.includes('case') ||
                   name.includes('sling') || name.includes('bipod') || name.includes('tactical') ||
                   name.includes('scope') || name.includes('mount') || name.includes('ring')) {
          newCategory = 'Accessories';
          movedToAccessories++;
        } else {
          newCategory = 'Accessories'; // Default for other non-handgun items
          movedToOther++;
        }
      } 
      // Now identify ACTUAL handguns by positive characteristics
      else if (
        // Clear handgun indicators
        name.includes('pistol') || name.includes('revolver') || 
        
        // Handgun manufacturers and models
        (name.includes('glock') && !name.includes('accessory') && !name.includes('sight')) ||
        (name.includes('sig') && (name.includes('p320') || name.includes('p365') || name.includes('p226') || name.includes('p229'))) ||
        name.includes('1911') ||
        (name.includes('smith') && (name.includes('wesson') || name.includes('bodyguard') || name.includes('shield'))) ||
        (name.includes('colt') && !name.includes('mount')) ||
        name.includes('beretta') ||
        name.includes('springfield') ||
        (name.includes('ruger') && (name.includes('lcp') || name.includes('sr9') || name.includes('mark'))) ||
        
        // Caliber indicators for handguns
        (name.includes('9mm') && !name.includes('carbine')) ||
        name.includes('.45 acp') || name.includes('45acp') ||
        name.includes('.40 s&w') || name.includes('40sw') ||
        name.includes('.357') || name.includes('.38') ||
        name.includes('.22 lr') && !name.includes('rifle')
      ) {
        newCategory = 'Handguns';
        actualHandguns++;
      }
      // Everything else that doesn't clearly identify as handgun -> move to accessories
      else {
        newCategory = 'Accessories';
        movedToOther++;
      }
      
      // Update if category changed
      if (newCategory !== product.category) {
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
        
        if (newCategory === 'Handguns') {
          console.log(`🔫 KEPT: ${product.name}`);
        } else {
          console.log(`🔄 MOVED: ${product.name} → ${newCategory}`);
        }
      } else if (newCategory === 'Handguns') {
        actualHandguns++;
      }
    }
    
    console.log('✅ Handgun identification completed:');
    console.log(`  🔫 Actual handguns identified: ${actualHandguns}`);
    console.log(`  📦 Moved to Magazines: ${movedToMagazines}`);
    console.log(`  🔧 Moved to Parts: ${movedToParts}`);
    console.log(`  🎯 Moved to Accessories: ${movedToAccessories}`);
    console.log(`  📋 Moved to Other: ${movedToOther}`);
    
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
    console.error('💥 Handgun identification failed:', error);
    throw error;
  }
}

// Run the identification
fixHandgunIdentification()
  .then(() => {
    console.log('✅ Handgun identification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Handgun identification failed:', error);
    process.exit(1);
  });