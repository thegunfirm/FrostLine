/**
 * Populate Subcategory Test Data
 * Adds subcategory information to existing products for testing the new filtering system
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, and, like, or } from "drizzle-orm";

/**
 * Determine subcategory based on product name for handgun products
 */
function determineSubcategory(name: string, category: string): string | null {
  if (category !== "Handguns") return null;
  
  const nameLower = name.toLowerCase();
  
  // Complete handguns (pistols/revolvers) - these should NOT have subcategory
  const handgunPatterns = [
    'glock', 'smith & wesson', 'sig sauer', 'ruger', 'springfield',
    'colt', 'beretta', 'walther', 'heckler & koch', 'remington',
    'kimber', 'wilson combat', 'daniel defense', 'cz', 'fn',
    'pistol', 'revolver', 'handgun'
  ];
  
  // Check if it's a complete handgun (should have NO subcategory)
  const isCompleteHandgun = handgunPatterns.some(pattern => 
    nameLower.includes(pattern) && 
    !nameLower.includes('barrel') && 
    !nameLower.includes('sight') && 
    !nameLower.includes('trigger') &&
    !nameLower.includes('grip') &&
    !nameLower.includes('magazine') &&
    !nameLower.includes('holster') &&
    !nameLower.includes('accessory')
  );
  
  if (isCompleteHandgun) {
    return null; // Complete handguns have NO subcategory
  }
  
  // Components and accessories DO have subcategories
  if (nameLower.includes('barrel')) return 'Barrels';
  if (nameLower.includes('sight') || nameLower.includes('optic')) return 'Sights & Optics';
  if (nameLower.includes('trigger')) return 'Triggers';
  if (nameLower.includes('grip')) return 'Grips';
  if (nameLower.includes('magazine') || nameLower.includes('mag ')) return 'Magazines';
  if (nameLower.includes('holster')) return 'Holsters';
  if (nameLower.includes('case') || nameLower.includes('box')) return 'Cases & Storage';
  if (nameLower.includes('cleaning')) return 'Cleaning';
  if (nameLower.includes('tool')) return 'Tools';
  
  // Default: if it's in Handguns category but not clearly a complete handgun, it's probably an accessory
  return 'Accessories';
}

async function populateSubcategoryTestData() {
  try {
    console.log('🔄 Starting subcategory test data population...');
    
    // Get all handgun products
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'))
      .limit(100); // Test with first 100 handgun products
    
    console.log(`📊 Found ${handgunProducts.length} handgun products to update`);
    
    let completeHandguns = 0;
    let accessories = 0;
    
    for (const product of handgunProducts) {
      const subcategory = determineSubcategory(product.name, product.category);
      
      if (subcategory === null) {
        completeHandguns++;
      } else {
        accessories++;
      }
      
      // Update the product with subcategory data
      await db.update(products)
        .set({
          subcategoryName: subcategory,
          departmentDesc: 'Firearms',
          subDepartmentDesc: subcategory || 'Complete Handguns'
        })
        .where(eq(products.id, product.id));
    }
    
    console.log(`✅ Updated ${handgunProducts.length} products:`);
    console.log(`   - Complete handguns (no subcategory): ${completeHandguns}`);
    console.log(`   - Accessories (with subcategory): ${accessories}`);
    
    // Test the filtering
    console.log('\n🧪 Testing subcategory filtering...');
    
    // Test 1: Complete handguns (subcategory_name IS NULL)
    const completeHandgunResults = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        eq(products.subcategoryName, null)
      ))
      .limit(5);
    
    console.log(`🔫 Complete handguns found: ${completeHandgunResults.length}`);
    completeHandgunResults.forEach(p => console.log(`   - ${p.name}`));
    
    // Test 2: Handgun accessories (subcategory_name IS NOT NULL)
    const accessoryResults = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        // Note: We need to check for NOT NULL differently in Drizzle
      ))
      .limit(5);
    
    console.log(`🔧 Handgun accessories sample:`);
    accessoryResults
      .filter(p => p.subcategoryName !== null)
      .slice(0, 5)
      .forEach(p => console.log(`   - ${p.name} (${p.subcategoryName})`));
    
    console.log('\n🎉 Subcategory test data population completed!');
    console.log('💡 Now test the Algolia filtering with NOT _exists_:subcategoryName');
    
  } catch (error) {
    console.error('❌ Error populating subcategory test data:', error);
  }
}

// Run the script
populateSubcategoryTestData().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});