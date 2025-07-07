/**
 * Complete Handgun Categorization Fix
 * Properly categorizes handguns vs accessories based on product names and descriptions
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, or, like, notLike } from 'drizzle-orm';

/**
 * Identify ACTUAL handgun products (complete firearms)
 */
function isActualHandgun(name: string, description: string = ''): boolean {
  const nameUpper = name.toUpperCase();
  const descUpper = description.toUpperCase();
  
  // EXCLUDE accessories first (these are NOT handguns)
  const accessoryTerms = [
    'BBL FOR', 'BBL FLTD', 'BBL FLT', 'BARREL',
    'COMP FOR', 'COMP FITS', 'COMPENSATOR',
    'TRIGGER', 'GRIP', 'HOLSTER', 'MAT',
    'SIGHT', 'SCOPE', 'OPTIC',
    'MAGAZINE', 'MAG FOR', 'CLIP',
    'SPRING', 'KIT FOR', 'PARTS',
    'MOUNT', 'RAIL', 'ADAPTER',
    'CASE', 'BOX', 'CLEANING',
    'OIL', 'LUBE', 'SOLVENT',
    'TOOL', 'WRENCH', 'DRIVER'
  ];
  
  // If it contains accessory terms, it's NOT a handgun
  for (const term of accessoryTerms) {
    if (nameUpper.includes(term)) {
      return false;
    }
  }
  
  // INCLUDE actual handgun models/manufacturers
  const handgunIndicators = [
    // Model numbers/names
    'GLOCK', 'G17', 'G19', 'G43', 'G48',
    'P320', 'P365', 'P226', 'P229',
    'M&P', 'SHIELD', 'BODYGUARD',
    '1911', 'KIMBER', 'COLT',
    'XD', 'XDS', 'HELLCAT',
    'BERETTA', '92FS', 'APX',
    'CZ', 'P10', 'P07',
    'WALTHER', 'PPQ', 'PPS',
    'HK', 'VP9', 'USP',
    'RUGER', 'LC9', 'LCP', 'SR',
    'TAURUS', 'G2C', 'G3C',
    'CANIK', 'TP9',
    
    // Calibers (strong indicators for complete firearms)
    '9MM', '.40', '.45', '.380',
    '10MM', '.357', '.38',
    
    // Action types
    'STRIKER', 'SA/DA', 'DAO'
  ];
  
  // Check for handgun indicators
  for (const indicator of handgunIndicators) {
    if (nameUpper.includes(indicator) || descUpper.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Categorize accessories that were incorrectly labeled as handguns
 */
function categorizeAccessory(name: string): string {
  const nameUpper = name.toUpperCase();
  
  if (nameUpper.includes('BBL') || nameUpper.includes('BARREL')) {
    return 'Parts';
  }
  if (nameUpper.includes('COMP') || nameUpper.includes('COMPENSATOR')) {
    return 'Parts';
  }
  if (nameUpper.includes('TRIGGER')) {
    return 'Parts';
  }
  if (nameUpper.includes('GRIP')) {
    return 'Parts';
  }
  if (nameUpper.includes('SIGHT') || nameUpper.includes('OPTIC')) {
    return 'Optics';
  }
  if (nameUpper.includes('HOLSTER')) {
    return 'Accessories';
  }
  if (nameUpper.includes('MAG') || nameUpper.includes('CLIP')) {
    return 'Parts';
  }
  if (nameUpper.includes('MOUNT') || nameUpper.includes('RAIL')) {
    return 'Parts';
  }
  
  // Default to Parts for other accessories
  return 'Parts';
}

/**
 * Fix handgun categorization completely
 */
async function fixHandgunCategorizationComplete() {
  console.log('🔧 Starting complete handgun categorization fix...');
  
  try {
    // Get all products currently categorized as "Handguns"
    const handgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} products currently categorized as Handguns`);
    
    let actualHandguns = 0;
    let movedToAccessories = 0;
    let movedToParts = 0;
    let movedToOptics = 0;
    
    for (const product of handgunProducts) {
      const isRealHandgun = isActualHandgun(product.name, product.description || '');
      
      if (isRealHandgun) {
        actualHandguns++;
        // Keep as Handgun - no change needed
      } else {
        // This is an accessory, recategorize it
        const newCategory = categorizeAccessory(product.name);
        
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
        
        console.log(`📦 Moved "${product.name}" from Handguns to ${newCategory}`);
        
        if (newCategory === 'Accessories') movedToAccessories++;
        else if (newCategory === 'Parts') movedToParts++;
        else if (newCategory === 'Optics') movedToOptics++;
      }
    }
    
    console.log('✅ Complete handgun categorization fix completed:');
    console.log(`   - ${actualHandguns} products remain as Handguns (actual firearms)`);
    console.log(`   - ${movedToParts} products moved to Parts`);
    console.log(`   - ${movedToAccessories} products moved to Accessories`);
    console.log(`   - ${movedToOptics} products moved to Optics`);
    
    // Verify final count
    const finalHandgunCount = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`🔍 Final verification: ${finalHandgunCount.length} products in Handguns category`);
    
  } catch (error) {
    console.error('❌ Error during handgun categorization fix:', error);
  }
}

// Run the fix
fixHandgunCategorizationComplete()
  .then(() => {
    console.log('🎯 Handgun categorization fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });