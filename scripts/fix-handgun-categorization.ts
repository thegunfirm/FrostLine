/**
 * Fix Handgun Categorization - Critical Data Fix
 * Properly categorizes all handgun products that are currently miscategorized
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, like, or, and, sql } from 'drizzle-orm';

/**
 * Identify handgun products based on manufacturer, name patterns, and description
 */
function isHandgunProduct(name: string, manufacturer: string, description: string = ''): boolean {
  const nameUpper = name.toUpperCase();
  const manufacturerUpper = (manufacturer || '').toUpperCase();
  const descUpper = (description || '').toUpperCase();
  
  // Major handgun manufacturers
  const handgunManufacturers = [
    'GLOCK', 'SIG SAUER', 'SMITH & WESSON', 'RUGER', 'SPRINGFIELD', 'BERETTA',
    'COLT', 'KIMBER', 'WALTHER', 'HK', 'HECKLER & KOCH', 'CZ', 'TAURUS',
    'KAHR', 'CHARTER ARMS', 'NORTH AMERICAN ARMS', 'HERITAGE', 'COBRA',
    'ROCK ISLAND', 'STI', 'PARA', 'NIGHTHAWK', 'WILSON COMBAT', 'DANIEL DEFENSE'
  ];
  
  // Handgun model patterns
  const handgunPatterns = [
    // Glock models
    'GLOCK 17', 'GLOCK 19', 'GLOCK 22', 'GLOCK 23', 'GLOCK 26', 'GLOCK 27',
    'GLOCK 29', 'GLOCK 30', 'GLOCK 31', 'GLOCK 32', 'GLOCK 33', 'GLOCK 34',
    'GLOCK 35', 'GLOCK 36', 'GLOCK 37', 'GLOCK 38', 'GLOCK 39', 'GLOCK 40',
    'GLOCK 41', 'GLOCK 42', 'GLOCK 43', 'GLOCK 44', 'GLOCK 45', 'GLOCK 48',
    'G17', 'G19', 'G22', 'G23', 'G26', 'G27', 'G29', 'G30', 'G34', 'G43',
    
    // Sig Sauer models
    'P226', 'P228', 'P229', 'P230', 'P232', 'P238', 'P239', 'P250', 'P320',
    'P365', 'P938', 'SP2022', 'M17', 'M18', 'SIG P', 'SIG SP',
    
    // Smith & Wesson models
    'M&P', 'M&P9', 'M&P40', 'M&P45', 'M&P380', 'SHIELD', 'BODYGUARD',
    'SW22', 'SW9', 'SW40', 'SW45', 'MODEL 642', 'MODEL 638', 'MODEL 442',
    'MODEL 340', 'MODEL 60', 'MODEL 686', 'MODEL 629', 'PERFORMANCE CENTER',
    
    // Springfield models
    'XD', 'XDM', 'XDS', 'HELLCAT', 'SAINT VICTOR', '1911',
    
    // Beretta models
    '92FS', '96', 'PX4', 'APX', 'BOBCAT', 'TOMCAT', 'CHEETAH',
    
    // Ruger models
    'LC9', 'LCP', 'SR9', 'SR22', 'SR40', 'SR45', 'SECURITY-9', 'MAX-9',
    'GP100', 'SP101', 'LCR', 'SUPER REDHAWK', 'BLACKHAWK',
    
    // Colt models
    '1911', 'PYTHON', 'COBRA', 'KING COBRA', 'MUSTANG',
    
    // General handgun terms
    'PISTOL', 'REVOLVER', 'HANDGUN', '.380 ACP', '9MM', '.40 S&W', '.45 ACP',
    '.38 SPECIAL', '.357 MAGNUM', '.44 MAGNUM', '.22 LR PISTOL'
  ];
  
  // Exclude accessories, parts, and non-handgun items
  const excludePatterns = [
    'HOLSTER', 'MAGAZINE', 'GRIP', 'SIGHT', 'BARREL', 'SLIDE', 'TRIGGER',
    'SPRING', 'PIN', 'SCREW', 'MOUNT', 'RAIL', 'LIGHT', 'LASER', 'CASE',
    'BAG', 'CLEANING', 'TOOL', 'KIT', 'AMMUNITION', 'AMMO', 'BULLET',
    'BRASS', 'PRIMER', 'POWDER', 'SCOPE', 'OPTIC', 'BIPOD', 'SLING',
    'STOCK', 'FOREND', 'HAND GUARD', 'MUZZLE', 'COMPENSATOR', 'SUPPRESSOR',
    'RIFLE', 'SHOTGUN', 'AR-15', 'AR15', 'AK-47', 'AK47'
  ];
  
  // Check if it's an excluded item
  for (const exclude of excludePatterns) {
    if (nameUpper.includes(exclude) || descUpper.includes(exclude)) {
      return false;
    }
  }
  
  // Check for handgun manufacturers
  for (const mfg of handgunManufacturers) {
    if (manufacturerUpper.includes(mfg)) {
      // If it's a known handgun manufacturer and not excluded, likely a handgun
      return true;
    }
  }
  
  // Check for specific handgun model patterns
  for (const pattern of handgunPatterns) {
    if (nameUpper.includes(pattern) || descUpper.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fix handgun categorization across the entire database
 */
async function fixHandgunCategorization() {
  console.log('🔧 Starting handgun categorization fix...');
  
  try {
    // Get all products that are NOT already in the Handguns category
    const allProducts = await db.select().from(products).where(
      and(
        sql`${products.category} != 'Handguns'`,
        sql`${products.isActive} = true`
      )
    );
    
    console.log(`📊 Found ${allProducts.length} products to analyze`);
    
    let handgunsFound = 0;
    const handgunUpdates: { id: number; name: string; manufacturer: string }[] = [];
    
    // Analyze each product
    for (const product of allProducts) {
      if (isHandgunProduct(product.name, product.manufacturer || '', product.description || '')) {
        handgunUpdates.push({
          id: product.id,
          name: product.name,
          manufacturer: product.manufacturer || ''
        });
        handgunsFound++;
      }
    }
    
    console.log(`🔫 Found ${handgunsFound} handgun products to recategorize:`);
    
    // Show sample of products being updated
    const sampleSize = Math.min(10, handgunUpdates.length);
    for (let i = 0; i < sampleSize; i++) {
      const product = handgunUpdates[i];
      console.log(`   • ${product.manufacturer} ${product.name}`);
    }
    
    if (handgunUpdates.length > sampleSize) {
      console.log(`   ... and ${handgunUpdates.length - sampleSize} more`);
    }
    
    // Update products in batches
    console.log('\n🔄 Updating product categories...');
    let updated = 0;
    
    for (const handgun of handgunUpdates) {
      await db.update(products)
        .set({ category: 'Handguns' })
        .where(eq(products.id, handgun.id));
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   ✅ Updated ${updated}/${handgunUpdates.length} products`);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updated} handgun products!`);
    
    // Verify the results
    const handgunCount = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.category, 'Handguns'));
    console.log(`📊 Total handguns in database: ${handgunCount[0].count}`);
    
    // Show breakdown by manufacturer
    const manufacturerBreakdown = await db.select({
      manufacturer: products.manufacturer,
      count: sql<number>`count(*)`
    })
    .from(products)
    .where(eq(products.category, 'Handguns'))
    .groupBy(products.manufacturer)
    .orderBy(sql`count(*) desc`)
    .limit(10);
    
    console.log('\n📈 Top handgun manufacturers:');
    for (const mfg of manufacturerBreakdown) {
      console.log(`   • ${mfg.manufacturer}: ${mfg.count} products`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing handgun categorization:', error);
    throw error;
  }
}

// Run the fix
fixHandgunCategorization()
  .then(() => {
    console.log('\n🎉 Handgun categorization fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix handgun categorization:', error);
    process.exit(1);
  });