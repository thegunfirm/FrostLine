/**
 * Fix Handgun Categorization Using Tags - Smart Detection
 * Uses tags to detect accessories/parts and properly categorizes non-handgun items
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Check if product has accessories or parts in tags (most reliable method)
 */
function hasAccessoryOrPartTags(tags: any): boolean {
  if (!tags || !Array.isArray(tags)) return false;
  
  const tagText = tags.join(' ').toUpperCase();
  return tagText.includes('ACCESSORIES') || 
         tagText.includes('ACCESSORY') || 
         tagText.includes('PARTS') || 
         tagText.includes('PART');
}

/**
 * Identify ACTUAL handgun products (complete firearms)
 */
function isActualHandgun(name: string, description: string = '', tags: any = null): boolean {
  // First check - if tags contain accessories/parts, definitely NOT a handgun
  if (hasAccessoryOrPartTags(tags)) {
    return false;
  }
  
  const nameUpper = name.toUpperCase();
  const descUpper = description.toUpperCase();
  const combined = `${nameUpper} ${descUpper}`;
  
  // Explicit component keywords - these are NOT complete handguns
  const componentKeywords = [
    'SLIDE', 'BARREL', 'FRAME ONLY', 'TRIGGER', 'GRIP', 'MAGAZINE', 'MAG ',
    'SPRING', 'PIN', 'SCREW', 'SIGHT', 'HOLSTER', 'CASE', 'KIT',
    'PART', 'COMPONENT', 'ASSEMBLY', 'UPPER', 'LOWER', 'RECEIVER ONLY',
    'BOLT', 'CARRIER', 'BUFFER', 'TUBE', 'STOCK', 'FOREND',
    'RAIL', 'MOUNT', 'ADAPTER', 'PLATE', 'PLUG', 'CAP',
    'SAFETY', 'SEAR', 'HAMMER', 'FIRING PIN', 'EXTRACTOR',
    'EJECTOR', 'PLUNGER', 'DETENT', 'BUSHING', 'GUIDE ROD',
    'RECOIL SPRING', 'MAINSPRING', 'LEAF SPRING', 'COIL SPRING',
    'CONNECTOR', 'TRIGGER BAR', 'TRIGGER HOUSING', 'BACKSTRAP',
    'BEAVERTAIL', 'THUMB SAFETY', 'GRIP SAFETY', 'SLIDE STOP',
    'SLIDE RELEASE', 'TAKEDOWN', 'DISASSEMBLY', 'REPLACEMENT',
    'UPGRADE', 'ACCESSORY', 'ATTACHMENT', 'MODIFICATION'
  ];
  
  // Check if this is a component
  for (const keyword of componentKeywords) {
    if (combined.includes(keyword)) {
      return false;
    }
  }
  
  // Complete handgun indicators
  const handgunIndicators = [
    'PISTOL', 'REVOLVER', 'HANDGUN', 'SIDEARM',
    // Specific complete firearm models
    'GLOCK 17', 'GLOCK 19', 'GLOCK 22', 'GLOCK 23', 'GLOCK 26', 'GLOCK 27',
    'SIG P320', 'SIG P365', 'SIG P229', 'SIG P226', 'SIG 1911',
    'SMITH & WESSON M&P', 'S&W M&P', 'RUGER LC9', 'RUGER LCP',
    'BERETTA 92', 'COLT 1911', 'SPRINGFIELD XD', 'KIMBER 1911',
    'TAURUS G2C', 'WALTHER P99', 'HK VP9', 'CANIK TP9'
  ];
  
  // Must have handgun indicators
  for (const indicator of handgunIndicators) {
    if (combined.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Categorize accessories that were incorrectly labeled as handguns
 */
function categorizeAccessory(name: string, tags: any = null): string {
  const nameUpper = name.toUpperCase();
  
  // Check tags first for specific category hints
  if (tags && Array.isArray(tags)) {
    const tagText = tags.join(' ').toUpperCase();
    if (tagText.includes('HOLSTER')) return 'Accessories';
    if (tagText.includes('MAGAZINE') || tagText.includes('MAG ')) return 'Parts and Components';
    if (tagText.includes('SIGHT') || tagText.includes('OPTIC')) return 'Optics & Scopes';
  }
  
  // Name-based categorization
  if (nameUpper.includes('HOLSTER')) return 'Accessories';
  if (nameUpper.includes('MAGAZINE') || nameUpper.includes('MAG ')) return 'Parts and Components';
  if (nameUpper.includes('SIGHT') || nameUpper.includes('SCOPE')) return 'Optics & Scopes';
  if (nameUpper.includes('SLIDE') || nameUpper.includes('BARREL')) return 'Parts and Components';
  if (nameUpper.includes('TRIGGER') || nameUpper.includes('SPRING')) return 'Parts and Components';
  if (nameUpper.includes('GRIP') || nameUpper.includes('FRAME')) return 'Parts and Components';
  if (nameUpper.includes('CASE') || nameUpper.includes('BOX')) return 'Accessories';
  
  // Default to parts for anything that was miscategorized
  return 'Parts and Components';
}

/**
 * Fix handgun categorization using tags and smart detection
 */
async function fixHandgunCategorizationWithTags() {
  console.log('🔍 Starting handgun categorization fix using tags...');
  
  try {
    // Get all products currently in Handguns category
    const handgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} products in Handguns category`);
    
    let actualHandguns = 0;
    let reclassifiedCount = 0;
    const reclassifications: { [key: string]: number } = {};
    
    for (const product of handgunProducts) {
      const isRealHandgun = isActualHandgun(
        product.name, 
        product.description || '', 
        product.tags
      );
      
      if (isRealHandgun) {
        actualHandguns++;
      } else {
        // This is not a real handgun, reclassify it
        const newCategory = categorizeAccessory(product.name, product.tags);
        
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
        
        reclassifiedCount++;
        reclassifications[newCategory] = (reclassifications[newCategory] || 0) + 1;
        
        console.log(`✅ Moved "${product.name}" from Handguns → ${newCategory}`);
      }
    }
    
    console.log('\n📈 Categorization Results:');
    console.log(`✅ Actual handguns remaining: ${actualHandguns}`);
    console.log(`🔄 Total reclassified: ${reclassifiedCount}`);
    console.log('\n📊 Reclassification breakdown:');
    
    for (const [category, count] of Object.entries(reclassifications)) {
      console.log(`   ${category}: ${count} products`);
    }
    
    // Verify results
    const finalHandgunCount = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`\n🎯 Final handgun count: ${finalHandgunCount.length}`);
    console.log('✅ Handgun categorization fix complete!');
    
  } catch (error) {
    console.error('💥 Error during handgun categorization fix:', error);
    throw error;
  }
}

// Run the fix
fixHandgunCategorizationWithTags().then(() => {
  console.log('✅ Handgun categorization fix completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Handgun categorization fix failed:', error);
  process.exit(1);
});