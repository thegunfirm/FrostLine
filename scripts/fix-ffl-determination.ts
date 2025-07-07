/**
 * Fix FFL Determination Logic
 * Correctly identifies all products that require FFL transfers based on comprehensive product analysis
 * This addresses the core issue where most authentic handgun/rifle/shotgun products are incorrectly marked as non-FFL
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, and, or, like, ilike } from 'drizzle-orm';

/**
 * Determine if a product requires FFL transfer based on comprehensive analysis
 */
function determineFFLRequirement(product: any): boolean {
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const departmentDesc = (product.departmentDesc || '').toLowerCase();
  const subcategoryName = (product.subcategoryName || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  
  // Definitive NON-FFL items (accessories, parts, ammo, etc.)
  const nonFFLKeywords = [
    'holster', 'magazine', 'mag', 'sight', 'scope', 'mount', 'rail', 'grip', 'stock',
    'trigger', 'spring', 'pin', 'screw', 'tool', 'cleaning', 'case', 'bag', 'sling',
    'light', 'laser', 'flashlight', 'battery', 'charger', 'cable', 'adapter',
    'ammunition', 'ammo', 'bullet', 'cartridge', 'brass', 'primer', 'powder',
    'lock', 'safe', 'vault', 'key', 'pad', 'alarm', 'sensor',
    'clothing', 'shirt', 'hat', 'cap', 'vest', 'jacket', 'glove',
    'accessory', 'part', 'component', 'kit', 'set', 'pack',
    'optic', 'lens', 'glass', 'prism', 'dot', 'reticle',
    'bipod', 'tripod', 'rest', 'support', 'stand',
    'muzzle brake', 'compensator', 'suppressor mount', 'thread protector',
    'forend', 'handguard', 'rail system', 'quad rail',
    'buffer', 'spring', 'tube', 'extension', 'adapter',
    'bolt', 'carrier', 'charging handle', 'selector',
    'ejector', 'extractor', 'firing pin', 'hammer',
    'takedown', 'disassembly', 'maintenance', 'repair'
  ];
  
  // Check if it's clearly a non-FFL item
  const isNonFFL = nonFFLKeywords.some(keyword => 
    name.includes(keyword) || description.includes(keyword)
  );
  
  if (isNonFFL) {
    return false;
  }
  
  // Definitive FFL items (complete firearms)
  const fflKeywords = [
    // Handgun indicators
    'pistol', 'revolver', 'handgun', 'glock', 'sig sauer', 'smith & wesson',
    'colt', 'beretta', 'ruger', 'springfield', 'taurus', 'h&k', 'heckler',
    'kimber', 'dan wesson', 'wilson combat', 'staccato', 'nighthawk',
    
    // Rifle indicators
    'rifle', 'carbine', 'ar-15', 'ar15', 'ak-47', 'ak47', 'bolt action',
    'semi-automatic', 'lever action', 'pump action', 'single shot',
    'remington', 'winchester', 'savage', 'tikka', 'browning', 'marlin',
    'henry', 'daniel defense', 'bcm', 'aero precision', 'lwrc',
    
    // Shotgun indicators
    'shotgun', 'gauge', '12ga', '20ga', '16ga', '28ga', '410',
    'mossberg', 'benelli', 'beretta', 'remington 870', 'remington 11',
    
    // Caliber/barrel indicators (when not parts)
    '9mm', '.45 acp', '.40 s&w', '.380 acp', '.357 mag', '.38 special',
    '.22 lr', '.223 rem', '5.56 nato', '.308 win', '7.62x39', '.30-06',
    '.270 win', '.243 win', '6.5 creedmoor', '.300 win mag'
  ];
  
  // Check if it's clearly an FFL item
  const isFFLItem = fflKeywords.some(keyword => 
    name.includes(keyword) || description.includes(keyword)
  );
  
  // Additional checks for complete firearms
  const hasBarrelLength = /\d+\.?\d*\s*["']?\s*(barrel|bbl)/i.test(name) || 
                         /\d+\.?\d*\s*["']?\s*(barrel|bbl)/i.test(description);
  
  const hasRoundCount = /\d+\s*(-|\+)?\s*(round|rd|shot)/i.test(name) ||
                       /\d+\s*(-|\+)?\s*(round|rd|shot)/i.test(description);
  
  // Category-based determination
  const isHandgunCategory = category.includes('handgun');
  const isRifleCategory = category.includes('rifle') || category.includes('long gun');
  const isShotgunCategory = category.includes('shotgun');
  
  // Department-based determination
  const isHandgunDept = departmentDesc.includes('handgun');
  const isFirearmDept = departmentDesc.includes('firearm') || 
                       departmentDesc.includes('rifle') || 
                       departmentDesc.includes('shotgun');
  
  // Comprehensive FFL determination
  return isFFLItem || 
         (hasBarrelLength && hasRoundCount) ||
         (isHandgunCategory && !isNonFFL) ||
         (isRifleCategory && !isNonFFL) ||
         (isShotgunCategory && !isNonFFL) ||
         (isHandgunDept && !isNonFFL) ||
         (isFirearmDept && !isNonFFL);
}

async function fixFFLDetermination() {
  try {
    console.log('🔫 Starting comprehensive FFL determination fix...');
    
    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`📊 Found ${allProducts.length} total products to analyze`);
    
    let updated = 0;
    let ffL_required = 0;
    let non_ffl = 0;
    
    // Process in batches to avoid memory issues
    const batchSize = 500;
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)}...`);
      
      for (const product of batch) {
        const shouldRequireFFL = determineFFLRequirement(product);
        
        if (product.requiresFFL !== shouldRequireFFL) {
          await db.update(products)
            .set({ requiresFFL: shouldRequireFFL })
            .where(eq(products.id, product.id));
          
          updated++;
          
          if (shouldRequireFFL) {
            console.log(`✅ Fixed FFL: ${product.name} (${product.category}) - now requires FFL`);
          }
        }
        
        if (shouldRequireFFL) {
          ffL_required++;
        } else {
          non_ffl++;
        }
      }
    }
    
    console.log(`🎉 FFL determination fix completed:`);
    console.log(`   📊 Products analyzed: ${allProducts.length}`);
    console.log(`   🔧 Products updated: ${updated}`);
    console.log(`   🔫 Products requiring FFL: ${ffL_required}`);
    console.log(`   📦 Products not requiring FFL: ${non_ffl}`);
    
    // Show category breakdown
    const categoryBreakdown = await db.select().from(products);
    const breakdown = categoryBreakdown.reduce((acc, product) => {
      const category = product.category || 'Unknown';
      if (!acc[category]) {
        acc[category] = { total: 0, ffl: 0 };
      }
      acc[category].total++;
      if (product.requiresFFL) {
        acc[category].ffl++;
      }
      return acc;
    }, {} as Record<string, { total: number; ffl: number }>);
    
    console.log('\n📋 Category breakdown after fix:');
    Object.entries(breakdown)
      .sort(([,a], [,b]) => b.total - a.total)
      .forEach(([category, stats]) => {
        console.log(`   ${category}: ${stats.ffl}/${stats.total} require FFL`);
      });
    
  } catch (error) {
    console.error('❌ Error fixing FFL determination:', error);
    throw error;
  }
}

fixFFLDetermination().then(() => {
  console.log('FFL determination fix completed');
}).catch(console.error);