/**
 * Fix Remaining Handgun Miscategorization
 * Identifies and corrects handgun products that are still categorized as accessories
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { and, or, like, not, isNull } from "drizzle-orm";

async function fixRemainingHandgunMiscategorization() {
  console.log('🔍 Finding miscategorized handgun products...');
  
  // Find products that are clearly handguns but not categorized properly
  const miscategorizedProducts = await db.select()
    .from(products)
    .where(
      and(
        or(
          like(products.name, '%pistol%'),
          like(products.name, '%handgun%'),
          like(products.name, '%revolver%'),
          and(like(products.name, '%9mm%'), not(like(products.name, '%ammo%')), not(like(products.name, '%magazine%'))),
          and(like(products.name, '%45acp%'), not(like(products.name, '%ammo%')), not(like(products.name, '%magazine%'))),
          and(like(products.name, '%40sw%'), not(like(products.name, '%ammo%')), not(like(products.name, '%magazine%'))),
          and(like(products.name, '%380%'), not(like(products.name, '%ammo%')), not(like(products.name, '%magazine%'))),
          like(products.name, '%colt%'),
          like(products.name, '%glock%'),
          like(products.name, '%smith%'),
          like(products.name, '%sig%'),
          like(products.name, '%beretta%'),
          like(products.name, '%springfield%'),
          like(products.name, '%ruger%')
        ),
        not(like(products.category, 'Handguns')),
        isNull(products.departmentNumber)
      )
    );
  
  console.log(`📊 Found ${miscategorizedProducts.length} potentially miscategorized handgun products`);
  
  if (miscategorizedProducts.length === 0) {
    console.log('✅ No miscategorized handgun products found');
    return;
  }
  
  console.log('\nFirst 10 miscategorized products:');
  miscategorizedProducts.slice(0, 10).forEach((product, i) => {
    console.log(`${i + 1}. ${product.sku} - ${product.name} (Current: ${product.category})`);
  });
  
  // Filter out obvious non-handguns (magazines, holsters, etc.)
  const actualHandguns = miscategorizedProducts.filter(product => {
    const name = product.name.toLowerCase();
    
    // Skip if it's clearly not a handgun
    if (name.includes('magazine') || name.includes('holster') || name.includes('sight') || 
        name.includes('grip') || name.includes('trigger') || name.includes('barrel') ||
        name.includes('slide') || name.includes('spring') || name.includes('pin') ||
        name.includes('screw') || name.includes('mount') || name.includes('rail') ||
        name.includes('light') || name.includes('laser') || name.includes('case') ||
        name.includes('cleaning') || name.includes('tool') || name.includes('kit') ||
        name.includes('ammo') || name.includes('ammunition') || name.includes('round')) {
      return false;
    }
    
    // Include if it has clear handgun indicators
    return name.includes('pistol') || name.includes('handgun') || name.includes('revolver') ||
           (name.includes('9mm') && !name.includes('carbine') && !name.includes('rifle')) ||
           (name.includes('45acp') && !name.includes('carbine') && !name.includes('rifle')) ||
           (name.includes('40sw') && !name.includes('carbine') && !name.includes('rifle')) ||
           (name.includes('380') && !name.includes('carbine') && !name.includes('rifle'));
  });
  
  console.log(`\n🎯 Identified ${actualHandguns.length} actual handgun products to fix`);
  
  if (actualHandguns.length === 0) {
    console.log('✅ No actual handgun products need fixing');
    return;
  }
  
  // Update these products
  for (const product of actualHandguns) {
    await db.update(products)
      .set({
        category: 'Handguns',
        departmentNumber: '01',
        tags: ['Handguns', product.manufacturer || 'Unknown']
      })
      .where(eq(products.id, product.id));
  }
  
  console.log(`✅ Fixed ${actualHandguns.length} miscategorized handgun products`);
  
  // Show some examples of what was fixed
  console.log('\nExamples of fixed products:');
  actualHandguns.slice(0, 5).forEach((product, i) => {
    console.log(`${i + 1}. ${product.sku} - ${product.name} → Handguns (Dept 01)`);
  });
}

fixRemainingHandgunMiscategorization().catch(console.error);