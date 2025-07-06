/**
 * Fix Product Categories - Recategorize All Products
 * Updates all products with proper categories based on RSR department numbers and product descriptions
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Map RSR department numbers to proper categories
 */
function mapDepartmentToCategory(departmentNumber: string): string {
  const categoryMap: Record<string, string> = {
    '1': 'Handguns',
    '2': 'Handguns',
    '3': 'Rifles',
    '4': 'Accessories',
    '5': 'Rifles',
    '6': 'Accessories',
    '7': 'Accessories',
    '8': 'Optics',
    '9': 'Optics',
    '10': 'Accessories',
    '11': 'Accessories',
    '12': 'Accessories',
    '13': 'Accessories',
    '14': 'Accessories',
    '15': 'Accessories',
    '16': 'Accessories',
    '17': 'Accessories',
    '18': 'Ammunition',
    '19': 'Accessories',
    '20': 'Accessories',
    '21': 'Accessories',
    '22': 'Accessories',
    '23': 'Accessories',
    '24': 'Accessories',
    '25': 'Safety',
    '26': 'Safety',
    '27': 'Accessories',
    '28': 'Optics',
    '29': 'Optics',
    '30': 'Accessories',
    '31': 'Optics',
    '32': 'Parts',
    '33': 'Accessories',
    '34': 'Parts',
    '35': 'Accessories',
    '36': 'Accessories',
    '38': 'Accessories',
    '39': 'Accessories',
    '40': 'Accessories',
    '41': 'Parts',
    '42': 'Parts',
    '43': 'Parts'
  };

  return categoryMap[departmentNumber] || 'Accessories';
}

/**
 * Smart categorization based on product name and description
 */
function categorizeByDescription(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();

  // Handguns
  if (text.includes('pistol') || text.includes('revolver') || 
      (text.includes('glock') && !text.includes('barrel') && !text.includes('part'))) {
    return 'Handguns';
  }

  // Rifles
  if (text.includes('rifle') || text.includes('carbine') || text.includes('ar-15') || 
      text.includes('ak-47') || text.includes('m4') || text.includes('308') ||
      text.includes('556') || text.includes('762') || text.includes('.223')) {
    return 'Rifles';
  }

  // Shotguns
  if (text.includes('shotgun') || text.includes('12ga') || text.includes('20ga') ||
      text.includes('gauge') || text.includes('shot shell')) {
    return 'Shotguns';
  }

  // Ammunition
  if (text.includes('ammo') || text.includes('ammunition') || text.includes('rounds') ||
      text.includes('cartridge') || text.includes('bullet') || text.includes('grain') ||
      text.includes('fmj') || text.includes('jhp') || text.includes('brass')) {
    return 'Ammunition';
  }

  // Optics
  if (text.includes('scope') || text.includes('sight') || text.includes('optic') ||
      text.includes('red dot') || text.includes('reflex') || text.includes('magnifier') ||
      text.includes('binoculars') || text.includes('rangefinder')) {
    return 'Optics';
  }

  // Parts
  if (text.includes('barrel') || text.includes('trigger') || text.includes('bolt') ||
      text.includes('upper') || text.includes('lower') || text.includes('receiver') ||
      text.includes('handguard') || text.includes('muzzle') || text.includes('firing pin')) {
    return 'Parts';
  }

  // Safety & Storage
  if (text.includes('safe') || text.includes('lock') || text.includes('security') ||
      text.includes('vault') || text.includes('case') && text.includes('gun')) {
    return 'Safety';
  }

  return 'Accessories';
}

/**
 * Update all product categories
 */
async function fixProductCategories() {
  console.log('🔧 Starting product category fix...');

  try {
    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`📊 Found ${allProducts.length} products to categorize`);

    let updated = 0;
    const categoryStats: Record<string, number> = {};

    // Process in batches of 100
    for (let i = 0; i < allProducts.length; i += 100) {
      const batch = allProducts.slice(i, i + 100);
      
      for (const product of batch) {
        // Try to determine category from SKU pattern (RSR department number)
        let newCategory = 'Accessories';
        
        // Smart categorization based on name and description
        newCategory = categorizeByDescription(product.name, product.description || '');
        
        // Update if different
        if (newCategory !== product.category) {
          await db.update(products)
            .set({ category: newCategory })
            .where(eq(products.id, product.id));
          updated++;
        }

        // Track stats
        categoryStats[newCategory] = (categoryStats[newCategory] || 0) + 1;
      }

      // Progress update
      console.log(`📦 Processed ${Math.min(i + 100, allProducts.length)}/${allProducts.length} products`);
    }

    console.log(`✅ Category fix complete!`);
    console.log(`📊 Updated ${updated} products`);
    console.log(`📈 Category distribution:`);
    
    Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} products`);
    });

  } catch (error) {
    console.error('❌ Error fixing categories:', error);
    throw error;
  }
}

// Run the fix
fixProductCategories().then(() => {
  console.log('🎉 Product categories fixed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Failed to fix categories:', error);
  process.exit(1);
});