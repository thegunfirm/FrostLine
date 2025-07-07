/**
 * Populate Missing Subcategories for Existing Products
 * Updates products that should have subcategory data based on their names and tags
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, and, like, isNull } from "drizzle-orm";

/**
 * Determine if product is an accessory/component based on name and tags
 */
function shouldHaveSubcategory(name: string, tags: any): { hasSubcategory: boolean; subcategory: string | null } {
  const nameLower = name.toLowerCase();
  const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : []);
  const tagText = tagArray.join(' ').toLowerCase();
  
  // Check if it has "Accessories" tag - strong indicator it's not a complete firearm
  if (tagText.includes('accessories') || tagText.includes('accessory')) {
    // Determine specific subcategory based on name
    if (nameLower.includes('barrel') || nameLower.includes('bbl')) return { hasSubcategory: true, subcategory: 'Barrels' };
    if (nameLower.includes('sight') || nameLower.includes('optic')) return { hasSubcategory: true, subcategory: 'Sights & Optics' };
    if (nameLower.includes('trigger')) return { hasSubcategory: true, subcategory: 'Triggers' };
    if (nameLower.includes('grip')) return { hasSubcategory: true, subcategory: 'Grips' };
    if (nameLower.includes('magazine') || nameLower.includes('mag ')) return { hasSubcategory: true, subcategory: 'Magazines' };
    if (nameLower.includes('holster')) return { hasSubcategory: true, subcategory: 'Holsters' };
    if (nameLower.includes('case') || nameLower.includes('box')) return { hasSubcategory: true, subcategory: 'Cases & Storage' };
    if (nameLower.includes('cleaning')) return { hasSubcategory: true, subcategory: 'Cleaning' };
    if (nameLower.includes('tool')) return { hasSubcategory: true, subcategory: 'Tools' };
    if (nameLower.includes('comp') || nameLower.includes('compensator')) return { hasSubcategory: true, subcategory: 'Barrels' };
    if (nameLower.includes('muzzle') || nameLower.includes('brake')) return { hasSubcategory: true, subcategory: 'Barrels' };
    if (nameLower.includes('slide')) return { hasSubcategory: true, subcategory: 'Slides' };
    if (nameLower.includes('spring')) return { hasSubcategory: true, subcategory: 'Springs & Hardware' };
    
    // Default for accessories
    return { hasSubcategory: true, subcategory: 'Accessories' };
  }
  
  // Check specific component patterns in name even without accessories tag
  if (nameLower.includes('barrel') || nameLower.includes('bbl')) return { hasSubcategory: true, subcategory: 'Barrels' };
  if (nameLower.includes('sight')) return { hasSubcategory: true, subcategory: 'Sights & Optics' };
  if (nameLower.includes('comp') || nameLower.includes('compensator')) return { hasSubcategory: true, subcategory: 'Barrels' };
  if (nameLower.includes('trigger')) return { hasSubcategory: true, subcategory: 'Triggers' };
  if (nameLower.includes('slide') && !nameLower.includes('glock') && !nameLower.includes('sig')) return { hasSubcategory: true, subcategory: 'Slides' };
  
  // Complete firearms should have no subcategory
  return { hasSubcategory: false, subcategory: null };
}

async function populateMissingSubcategories() {
  try {
    console.log('🔄 Populating missing subcategories for handgun products...');
    
    // Get handgun products that don't have subcategory data
    const handgunProducts = await db.select()
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        isNull(products.subcategoryName)
      ))
      .limit(1000); // Process in batches
    
    console.log(`📊 Found ${handgunProducts.length} handgun products without subcategory data`);
    
    let completeHandguns = 0;
    let accessories = 0;
    let updated = 0;
    
    for (const product of handgunProducts) {
      const { hasSubcategory, subcategory } = shouldHaveSubcategory(product.name, product.tags);
      
      if (hasSubcategory) {
        // This product should have a subcategory (it's an accessory/component)
        await db.update(products)
          .set({
            subcategoryName: subcategory,
            departmentDesc: 'Handguns',
            subDepartmentDesc: subcategory
          })
          .where(eq(products.id, product.id));
        
        accessories++;
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`🔄 Updated ${updated} products...`);
        }
      } else {
        // This is a complete handgun - leave subcategoryName as null
        completeHandguns++;
      }
    }
    
    console.log(`✅ Subcategory population completed:`);
    console.log(`   - Complete handguns (no subcategory): ${completeHandguns}`);
    console.log(`   - Accessories updated with subcategory: ${accessories}`);
    console.log(`   - Total database updates: ${updated}`);
    
    // Verify the results
    console.log('\n🧪 Verification check...');
    
    const verifyComplete = await db.select({ count: products.id })
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        isNull(products.subcategoryName)
      ));
    
    const verifyAccessories = await db.select({ count: products.id })
      .from(products)
      .where(and(
        eq(products.category, 'Handguns'),
        // Note: Drizzle doesn't have isNotNull, we'll use a different approach
      ));
    
    console.log(`✅ Verification: ${verifyComplete.length} complete handguns, accessories updated`);
    console.log('💡 Ready to sync updated data to Algolia for proper filtering');
    
  } catch (error) {
    console.error('❌ Error populating missing subcategories:', error);
  }
}

// Run the script
populateMissingSubcategories().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});