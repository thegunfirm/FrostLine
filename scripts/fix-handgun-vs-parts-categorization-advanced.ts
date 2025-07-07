/**
 * Advanced Handgun vs Parts Categorization Fix
 * Uses product names and descriptions to properly identify complete handguns vs components
 * This addresses the core issue where slides, barrels, and other parts are incorrectly categorized as handguns
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, like, or, and } from "drizzle-orm";

/**
 * Identify handgun components/parts that should NOT be in handguns category
 */
function isHandgunComponent(name: string, description: string = ''): boolean {
  const productText = (name + ' ' + description).toLowerCase();
  
  // Specific handgun components - these are NOT complete firearms
  const componentKeywords = [
    'slide', 'slides',
    'barrel', 'barrels', 
    'frame', 'frames',
    'trigger', 'triggers',
    'bolt', 'bolts',
    'firing pin',
    'extractor',
    'ejector',
    'recoil spring',
    'guide rod',
    'magazine', 'magazines', 'mag',
    'grip', 'grips',
    'safety',
    'hammer',
    'sear',
    'spring kit',
    'pin set',
    'parts kit',
    'conversion kit',
    'upgrade kit',
    'replacement',
    'component',
    'assembly',
    'sub-assembly'
  ];
  
  return componentKeywords.some(keyword => productText.includes(keyword));
}

/**
 * Identify complete handgun products (actual firearms)
 */
function isCompleteHandgun(name: string, description: string = ''): boolean {
  const productText = (name + ' ' + description).toLowerCase();
  
  // If it's a component, it's definitely not a complete handgun
  if (isHandgunComponent(name, description)) {
    return false;
  }
  
  // Complete handgun indicators
  const handgunKeywords = [
    'pistol', 'pistols',
    'revolver', 'revolvers', 
    'handgun', 'handguns',
    'firearm', 'firearms'
  ];
  
  // Model patterns that indicate complete handguns
  const handgunModelPatterns = [
    /glock\s+\d+/i,
    /p\d+/i,  // P320, P365, etc.
    /m&p/i,   // Smith & Wesson M&P
    /1911/i,
    /sig.*p\d+/i,
    /cz.*\d+/i
  ];
  
  // Check for handgun keywords
  const hasHandgunKeywords = handgunKeywords.some(keyword => productText.includes(keyword));
  
  // Check for model patterns
  const hasHandgunPattern = handgunModelPatterns.some(pattern => pattern.test(productText));
  
  return hasHandgunKeywords || hasHandgunPattern;
}

/**
 * Categorize handgun components properly
 */
function categorizeHandgunComponent(name: string, description: string = ''): string {
  const productText = (name + ' ' + description).toLowerCase();
  
  if (productText.includes('magazine') || productText.includes('mag')) {
    return 'Magazines';
  }
  
  if (productText.includes('trigger')) {
    return 'Triggers';
  }
  
  if (productText.includes('barrel')) {
    return 'Barrels';
  }
  
  if (productText.includes('slide')) {
    return 'Slides';
  }
  
  if (productText.includes('grip')) {
    return 'Grips';
  }
  
  if (productText.includes('sight') || productText.includes('optic')) {
    return 'Optics';
  }
  
  // Default for handgun parts
  return 'Accessories';
}

/**
 * Fix handgun vs components categorization
 */
async function fixHandgunVsComponentsCategorization() {
  console.log('🔧 Starting advanced handgun vs components categorization fix...');
  
  try {
    // Get all products currently in Handguns category
    const handgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} products in Handguns category`);
    
    let componentsFixed = 0;
    let actualHandgunsConfirmed = 0;
    
    for (const product of handgunProducts) {
      const name = product.name || '';
      const description = product.description || '';
      
      // Check if this is actually a component/part
      if (isHandgunComponent(name, description)) {
        const newCategory = categorizeHandgunComponent(name, description);
        
        await db
          .update(products)
          .set({ category: newCategory })
          .where(eq(products.id, product.id));
        
        console.log(`🔧 Fixed: "${name}" -> ${newCategory}`);
        componentsFixed++;
      } else if (isCompleteHandgun(name, description)) {
        // This is actually a complete handgun - confirm it stays
        actualHandgunsConfirmed++;
      } else {
        // Unclear - let's examine what this is
        console.log(`❓ Unclear product: "${name}" - ${description}`);
      }
    }
    
    console.log(`\n✅ Categorization fix completed:`);
    console.log(`   🔧 Components moved out of Handguns: ${componentsFixed}`);
    console.log(`   ✅ Actual handguns confirmed: ${actualHandgunsConfirmed}`);
    
    // Now check some specific problematic products
    const slideProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, 'Handguns'),
          or(
            like(products.name, '%slide%'),
            like(products.name, '%SLIDE%')
          )
        )
      );
    
    console.log(`\n🔍 Found ${slideProducts.length} slide products still in Handguns`);
    for (const slide of slideProducts) {
      console.log(`   - ${slide.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing categorization:', error);
  }
}

// Run the fix
fixHandgunVsComponentsCategorization();