/**
 * Fix Handgun vs Parts Categorization - Advanced Detection
 * Properly separates complete handguns from handgun components (barrels, slides, etc.)
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Identify complete handgun products vs handgun components
 */
function isCompleteHandgun(name: string, description: string = ''): boolean {
  const nameUpper = name.toUpperCase();
  const descUpper = description.toUpperCase();
  const combined = `${nameUpper} ${descUpper}`;
  
  // Explicit handgun component keywords - these are NOT complete handguns
  const componentKeywords = [
    'SLIDE', 'BARREL', 'FRAME', 'TRIGGER', 'GRIP', 'MAGAZINE', 'MAG',
    'SPRING', 'PIN', 'SCREW', 'SIGHT', 'HOLSTER', 'CASE', 'KIT',
    'PART', 'COMPONENT', 'ASSEMBLY', 'UPPER', 'LOWER', 'RECEIVER',
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
    'GLOCK', 'SIG', 'SMITH & WESSON', 'S&W', 'RUGER',
    'BERETTA', 'COLT', 'SPRINGFIELD', 'KIMBER', 'TAURUS',
    'WALTHER', 'HK', 'HECKLER', 'FN', 'CZ', 'CANIK'
  ];
  
  // Model number patterns for complete handguns
  const modelPatterns = [
    /G\d{2,3}/, // Glock models (G17, G19, etc.)
    /P\d{2,3}/, // Sig models (P320, P226, etc.)
    /M&P/, // Smith & Wesson M&P
    /\d{4}/, // 4-digit model numbers
    /MODEL \d+/, // "MODEL 19" etc.
    /MK\s*\d+/, // Mark variants
    /GEN\s*\d+/, // Generation variants
  ];
  
  // Check for handgun indicators
  let hasHandgunIndicator = false;
  for (const indicator of handgunIndicators) {
    if (combined.includes(indicator)) {
      hasHandgunIndicator = true;
      break;
    }
  }
  
  // Check for model patterns
  let hasModelPattern = false;
  for (const pattern of modelPatterns) {
    if (pattern.test(combined)) {
      hasModelPattern = true;
      break;
    }
  }
  
  // Must have either handgun indicator or model pattern
  if (!hasHandgunIndicator && !hasModelPattern) {
    return false;
  }
  
  // Special case: if it contains caliber information, likely a complete gun
  const caliberPatterns = [
    /\.22/, /\.25/, /\.32/, /\.38/, /\.357/, /\.380/, /\.40/, /\.44/, /\.45/,
    /9MM/, /10MM/, /45ACP/, /40S&W/, /357MAG/, /38SPL/, /22LR/
  ];
  
  for (const pattern of caliberPatterns) {
    if (pattern.test(combined)) {
      return true;
    }
  }
  
  return hasHandgunIndicator || hasModelPattern;
}

/**
 * Categorize handgun components to appropriate categories
 */
function categorizeHandgunComponent(name: string, description: string = ''): string {
  const nameUpper = name.toUpperCase();
  const descUpper = description.toUpperCase();
  const combined = `${nameUpper} ${descUpper}`;
  
  // Optics and sights
  if (combined.includes('SIGHT') || combined.includes('OPTIC') || 
      combined.includes('SCOPE') || combined.includes('RED DOT') ||
      combined.includes('LASER') || combined.includes('REFLEX')) {
    return 'Optics';
  }
  
  // Holsters and cases
  if (combined.includes('HOLSTER') || combined.includes('CASE') ||
      combined.includes('BAG') || combined.includes('STORAGE')) {
    return 'Accessories';
  }
  
  // Everything else goes to Parts
  return 'Parts';
}

/**
 * Fix handgun vs parts categorization
 */
async function fixHandgunVsPartsCategorization() {
  console.log('🔄 Starting handgun vs parts categorization fix...');
  
  try {
    // Get all products currently categorized as "Handguns"
    const handgunProducts = await db.select().from(products).where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} products in Handguns category`);
    
    let actualHandguns = 0;
    let movedToParts = 0;
    let movedToOptics = 0;
    let movedToAccessories = 0;
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < handgunProducts.length; i += batchSize) {
      const batch = handgunProducts.slice(i, i + batchSize);
      
      for (const product of batch) {
        const isActualHandgun = isCompleteHandgun(product.name, product.description || '');
        
        if (isActualHandgun) {
          actualHandguns++;
          // Keep in Handguns category
        } else {
          // Move to appropriate category
          const newCategory = categorizeHandgunComponent(product.name, product.description || '');
          
          await db.update(products)
            .set({ category: newCategory })
            .where(eq(products.id, product.id));
          
          if (newCategory === 'Parts') {
            movedToParts++;
          } else if (newCategory === 'Optics') {
            movedToOptics++;
          } else if (newCategory === 'Accessories') {
            movedToAccessories++;
          }
          
          console.log(`📦 Moved "${product.name}" from Handguns to ${newCategory}`);
        }
      }
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(handgunProducts.length / batchSize)}`);
    }
    
    console.log('\n📊 Categorization Summary:');
    console.log(`✅ Actual handguns remaining: ${actualHandguns}`);
    console.log(`📦 Moved to Parts: ${movedToParts}`);
    console.log(`🔍 Moved to Optics: ${movedToOptics}`);
    console.log(`🎯 Moved to Accessories: ${movedToAccessories}`);
    console.log(`📈 Total processed: ${handgunProducts.length}`);
    
    console.log('\n🎯 Handgun vs Parts categorization complete!');
    
  } catch (error) {
    console.error('❌ Error fixing handgun vs parts categorization:', error);
    throw error;
  }
}

// Run the fix
fixHandgunVsPartsCategorization().catch(console.error);