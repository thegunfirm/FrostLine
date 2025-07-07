/**
 * Fix Handgun Accessories Categorization - Critical Data Fix
 * Properly categorizes handgun accessories that are incorrectly marked as "Handguns"
 * Uses RSR tags to identify accessories and recategorize them correctly
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

/**
 * Check if a product is an accessory based on its RSR tags
 */
function isAccessoryByTags(tags: any): boolean {
  if (!tags || !Array.isArray(tags)) return false;
  
  // Check for specific accessory tags
  const accessoryTags = tags.map((tag: any) => typeof tag === 'string' ? tag.toLowerCase() : '');
  
  return accessoryTags.some((tag: string) => 
    tag.includes('accessories') || 
    tag.includes('parts') ||
    tag.includes('slide') ||
    tag.includes('barrel') ||
    tag.includes('grip') ||
    tag.includes('magazine') ||
    tag.includes('sight') ||
    tag.includes('trigger')
  );
}

/**
 * Categorize accessories based on product name and type
 */
function categorizeAccessory(name: string, tags: any = null): string {
  const nameLC = name.toLowerCase();
  
  // Check for specific accessory types in name
  if (nameLC.includes('slide') || nameLC.includes('barrel') || nameLC.includes('frame')) {
    return 'Handgun Parts';
  }
  
  if (nameLC.includes('magazine') || nameLC.includes('mag ')) {
    return 'Magazines';
  }
  
  if (nameLC.includes('sight') || nameLC.includes('optic') || nameLC.includes('scope')) {
    return 'Optics';
  }
  
  if (nameLC.includes('grip') || nameLC.includes('stock')) {
    return 'Accessories';
  }
  
  if (nameLC.includes('holster') || nameLC.includes('case')) {
    return 'Cases & Holsters';
  }
  
  if (nameLC.includes('cleaning') || nameLC.includes('tool')) {
    return 'Cleaning & Maintenance';
  }
  
  // Default to Accessories for other cases
  return 'Accessories';
}

/**
 * Fix handgun accessories categorization
 */
async function fixHandgunAccessoriesCategoriztion() {
  console.log('🔧 Starting handgun accessories categorization fix...');
  
  try {
    // Find all products in Handguns category
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`📊 Found ${handgunProducts.length} products in Handguns category`);
    
    let accessoriesFound = 0;
    let categoriesUpdated = 0;
    
    for (const product of handgunProducts) {
      // Check if this is actually an accessory
      if (isAccessoryByTags(product.tags)) {
        accessoriesFound++;
        
        // Determine the correct category
        const correctCategory = categorizeAccessory(product.name, product.tags);
        
        console.log(`🔄 Recategorizing: ${product.sku} - "${product.name}"`);
        console.log(`   From: Handguns → To: ${correctCategory}`);
        console.log(`   Tags: ${JSON.stringify(product.tags)}`);
        
        // Update the product category
        await db.update(products)
          .set({ category: correctCategory })
          .where(eq(products.id, product.id));
        
        categoriesUpdated++;
      }
    }
    
    console.log('\n✅ Handgun accessories categorization fix completed!');
    console.log(`📈 Statistics:`);
    console.log(`   - Total handgun products checked: ${handgunProducts.length}`);
    console.log(`   - Accessories found in handguns: ${accessoriesFound}`);
    console.log(`   - Categories updated: ${categoriesUpdated}`);
    
    if (accessoriesFound > 0) {
      console.log('\n🔄 Run Algolia sync next to update search index');
    }
    
  } catch (error) {
    console.error('❌ Error fixing handgun accessories categorization:', error);
    throw error;
  }
}

// Run the fix
fixHandgunAccessoriesCategoriztion()
  .then(() => {
    console.log('🎯 Handgun accessories categorization fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Handgun accessories categorization fix failed:', error);
    process.exit(1);
  });