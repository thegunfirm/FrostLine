/**
 * Fix Product Categorization Using Actual Database Fields
 * Corrects categorization using name and tags fields that actually exist
 * Addresses the core issue where slides, barrels, and parts are miscategorized as handguns
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, like, and, or } from "drizzle-orm";

/**
 * Determine if a product is a handgun component based on name and tags
 */
function isHandgunComponent(name: string, tags: any): boolean {
  const nameUpper = name.toUpperCase();
  
  // Check tags first - most reliable indicator
  if (tags && Array.isArray(tags)) {
    const tagText = tags.join(' ').toUpperCase();
    if (tagText.includes('ACCESSORIES')) return true;
    if (tagText.includes('PARTS')) return true;
    if (tagText.includes('COMPONENTS')) return true;
  }
  
  // Check name for component keywords
  const componentKeywords = [
    'SLIDE', 'BARREL', 'BBL', 'TRIGGER', 'GRIP', 'FRAME',
    'MAGAZINE', 'MAG ', 'SIGHT', 'COMPENSATOR', 'COMP',
    'MOUNT', 'RAIL', 'SPRING', 'PIN', 'SCREW', 'KIT',
    'HOLSTER', 'CASE', 'ACCESSORY'
  ];
  
  return componentKeywords.some(keyword => nameUpper.includes(keyword));
}

/**
 * Determine if a product is a complete handgun
 */
function isCompleteHandgun(name: string, manufacturer: string): boolean {
  const nameUpper = name.toUpperCase();
  const mfgUpper = manufacturer?.toUpperCase() || '';
  
  // Skip obvious components
  if (isHandgunComponent(name, null)) return false;
  
  // Look for complete handgun indicators
  const handgunIndicators = [
    'PISTOL', 'REVOLVER', 'HANDGUN'
  ];
  
  // Check for model patterns that indicate complete firearms
  const modelPatterns = [
    /GLOCK\s*\d+/i,
    /P\d{3}/i,  // P320, P365, etc.
    /M&P/i,
    /1911/i,
    /BERETTA/i
  ];
  
  // Must have handgun indicators or be from known handgun manufacturers
  const hasHandgunIndicator = handgunIndicators.some(indicator => nameUpper.includes(indicator));
  const hasModelPattern = modelPatterns.some(pattern => pattern.test(name));
  
  return hasHandgunIndicator || hasModelPattern;
}

/**
 * Categorize handgun components to proper categories
 */
function categorizeComponent(name: string, tags: any): string {
  const nameUpper = name.toUpperCase();
  
  // Check tags for category hints
  if (tags && Array.isArray(tags)) {
    const tagText = tags.join(' ').toUpperCase();
    if (tagText.includes('OPTIC') || tagText.includes('SIGHT')) return 'Optics & Scopes';
    if (tagText.includes('ACCESSORIES')) return 'Accessories';
  }
  
  // Name-based categorization
  if (nameUpper.includes('SIGHT') || nameUpper.includes('SCOPE') || nameUpper.includes('OPTIC')) {
    return 'Optics & Scopes';
  }
  if (nameUpper.includes('HOLSTER') || nameUpper.includes('CASE')) {
    return 'Accessories';
  }
  if (nameUpper.includes('SLIDE') || nameUpper.includes('BARREL') || nameUpper.includes('BBL')) {
    return 'Parts and Components';
  }
  if (nameUpper.includes('TRIGGER') || nameUpper.includes('GRIP') || nameUpper.includes('FRAME')) {
    return 'Parts and Components';
  }
  if (nameUpper.includes('MAGAZINE') || nameUpper.includes('MAG ')) {
    return 'Parts and Components';
  }
  
  // Default for components
  return 'Parts and Components';
}

/**
 * Fix product categorization using actual database fields
 */
async function fixCategorizationUsingActualFields() {
  console.log('🔧 Starting categorization fix using actual database fields...\n');

  // First, let's see what we're working with
  console.log('📊 Analyzing current Handguns category...');
  const handgunProducts = await db
    .select({
      id: products.id,
      name: products.name,
      manufacturer: products.manufacturer,
      tags: products.tags
    })
    .from(products)
    .where(eq(products.category, 'Handguns'));

  console.log(`Found ${handgunProducts.length} products in Handguns category`);

  let componentsFound = 0;
  let completeHandgunsFound = 0;
  let updatesNeeded = [];

  // Analyze each product
  for (const product of handgunProducts) {
    if (isHandgunComponent(product.name, product.tags)) {
      componentsFound++;
      const newCategory = categorizeComponent(product.name, product.tags);
      updatesNeeded.push({
        id: product.id,
        name: product.name,
        currentCategory: 'Handguns',
        newCategory: newCategory,
        reason: 'Component detected'
      });
    } else if (isCompleteHandgun(product.name, product.manufacturer || '')) {
      completeHandgunsFound++;
    } else {
      // Unclear - needs manual review
      console.log(`⚠️  Unclear categorization: ${product.name}`);
    }
  }

  console.log(`\n📈 Analysis Results:`);
  console.log(`   • Components incorrectly in Handguns: ${componentsFound}`);
  console.log(`   • Actual complete handguns: ${completeHandgunsFound}`);
  console.log(`   • Updates needed: ${updatesNeeded.length}\n`);

  if (updatesNeeded.length === 0) {
    console.log('✅ No categorization updates needed!');
    return;
  }

  // Show some examples of what will be updated
  console.log('🔍 Examples of products that will be recategorized:');
  updatesNeeded.slice(0, 5).forEach(update => {
    console.log(`   • "${update.name}" → ${update.newCategory} (${update.reason})`);
  });

  if (updatesNeeded.length > 5) {
    console.log(`   ... and ${updatesNeeded.length - 5} more products\n`);
  }

  // Perform the updates
  console.log('🔄 Updating product categories...');
  let updateCount = 0;

  for (const update of updatesNeeded) {
    try {
      await db
        .update(products)
        .set({ category: update.newCategory })
        .where(eq(products.id, update.id));
      
      updateCount++;
      
      if (updateCount % 10 === 0) {
        console.log(`   Updated ${updateCount}/${updatesNeeded.length} products...`);
      }
    } catch (error) {
      console.error(`❌ Failed to update product ${update.id}: ${error}`);
    }
  }

  console.log(`\n✅ Successfully updated ${updateCount} products!`);
  
  // Verify the specific product mentioned by user
  console.log('\n🎯 Checking specific product ZAFZPS2P320CBLK...');
  const specificProduct = await db
    .select({
      sku: products.sku,
      name: products.name,
      category: products.category,
      tags: products.tags
    })
    .from(products)
    .where(eq(products.sku, 'ZAFZPS2P320CBLK'));

  if (specificProduct.length > 0) {
    const product = specificProduct[0];
    console.log(`   • Name: ${product.name}`);
    console.log(`   • Current Category: ${product.category}`);
    console.log(`   • Tags: ${JSON.stringify(product.tags)}`);
    
    if (product.category === 'Handguns' && product.name.includes('SLIDE')) {
      console.log('   ⚠️  This slide is still in Handguns - fixing now...');
      
      await db
        .update(products)
        .set({ category: 'Parts and Components' })
        .where(eq(products.sku, 'ZAFZPS2P320CBLK'));
        
      console.log('   ✅ Fixed! Moved to Parts and Components');
    } else {
      console.log('   ✅ Already correctly categorized');
    }
  }

  console.log('\n🎉 Categorization fix completed using actual database fields!');
}

// Run the fix
fixCategorizationUsingActualFields()
  .then(() => {
    console.log('\n✅ Categorization fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix categorization:', error);
    process.exit(1);
  });