/**
 * Extract Sight Types for Rifles and Shotguns
 * Analyzes RSR product names to extract sight type information
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

async function extractSightTypes() {
  console.log('🔍 Starting sight type extraction for rifles and shotguns...');
  
  // Get all long guns (department 05) without sight type data
  const longGuns = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '05'),
        or(
          isNull(products.sightType),
          eq(products.sightType, '')
        )
      )
    );

  console.log(`📊 Found ${longGuns.length} long guns without sight type data`);
  
  let updateCount = 0;
  const sightTypePatterns = [
    // Iron sights
    { pattern: /\b(iron\s*sight|iron\s*sights|fixed\s*sight|fixed\s*sights)\b/i, type: 'Iron Sights' },
    { pattern: /\b(flip\s*up|flip\s*sight|flip\s*up\s*sight)\b/i, type: 'Flip-Up Sights' },
    { pattern: /\b(front\s*sight|rear\s*sight|front\s*post|rear\s*post)\b/i, type: 'Iron Sights' },
    
    // Optics ready
    { pattern: /\b(optics\s*ready|optic\s*ready|rail\s*ready|pic\s*rail)\b/i, type: 'Optics Ready' },
    { pattern: /\b(picatinny|weaver|mlok|m-lok|keymod)\b/i, type: 'Optics Ready' },
    { pattern: /\b(scope\s*ready|scope\s*mount|scope\s*base)\b/i, type: 'Optics Ready' },
    
    // Fiber optic
    { pattern: /\b(fiber\s*optic|fibre\s*optic|fiber\s*sight)\b/i, type: 'Fiber Optic' },
    { pattern: /\b(hi-viz|hiviz|fiber\s*optic\s*sight)\b/i, type: 'Fiber Optic' },
    
    // Ghost ring
    { pattern: /\b(ghost\s*ring|ghost\s*sight|peep\s*sight)\b/i, type: 'Ghost Ring' },
    
    // Adjustable sights
    { pattern: /\b(adjustable\s*sight|adj\s*sight|adjustable\s*rear)\b/i, type: 'Adjustable Sights' },
    { pattern: /\b(target\s*sight|match\s*sight|competition\s*sight)\b/i, type: 'Adjustable Sights' },
    
    // Red dot ready
    { pattern: /\b(red\s*dot|red\s*dot\s*ready|micro\s*dot)\b/i, type: 'Red Dot Ready' },
    { pattern: /\b(reflex\s*sight|reflex\s*ready|1x\s*optic)\b/i, type: 'Red Dot Ready' },
    
    // Tritium/Night sights
    { pattern: /\b(tritium|night\s*sight|glow\s*sight|luminous)\b/i, type: 'Night Sights' },
    { pattern: /\b(3\s*dot|three\s*dot|trijicon|meprolight)\b/i, type: 'Night Sights' },
    
    // No sights
    { pattern: /\b(no\s*sight|without\s*sight|bare\s*barrel|no\s*iron)\b/i, type: 'No Sights' },
    { pattern: /\b(drilled\s*tapped|d&t|scope\s*only)\b/i, type: 'No Sights' },
    
    // Bead sight (common on shotguns)
    { pattern: /\b(bead\s*sight|brass\s*bead|fiber\s*bead|front\s*bead)\b/i, type: 'Bead Sight' },
    
    // Rifle sights
    { pattern: /\b(rifle\s*sight|military\s*sight|a2\s*sight|a4\s*sight)\b/i, type: 'Rifle Sights' },
    { pattern: /\b(backup\s*sight|buis|back\s*up\s*iron)\b/i, type: 'Backup Sights' },
    
    // Scope specific
    { pattern: /\b(scope\s*included|w\/\s*scope|with\s*scope)\b/i, type: 'Scope Included' },
    { pattern: /\b(variable\s*scope|fixed\s*scope|hunting\s*scope)\b/i, type: 'Scope Included' }
  ];
  
  // Process products in batches
  for (const product of longGuns) {
    const productName = product.name.toLowerCase();
    let extractedSightType = '';
    
    // Check each pattern
    for (const { pattern, type } of sightTypePatterns) {
      if (pattern.test(productName)) {
        extractedSightType = type;
        break; // Use the first match
      }
    }
    
    if (extractedSightType) {
      try {
        await db
          .update(products)
          .set({ sightType: extractedSightType })
          .where(eq(products.id, product.id));
        
        updateCount++;
        
        if (updateCount % 100 === 0) {
          console.log(`✅ Updated ${updateCount} products with sight type data`);
        }
      } catch (error) {
        console.error(`❌ Error updating product ${product.id}:`, error);
      }
    }
  }
  
  // Get final statistics
  const finalStats = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '05'),
        isNull(products.sightType)
      )
    );
  
  const totalLongGuns = longGuns.length;
  const remainingWithoutSight = finalStats.length;
  const updatedCount = totalLongGuns - remainingWithoutSight;
  const coveragePercent = ((updatedCount / totalLongGuns) * 100).toFixed(1);
  
  console.log(`🎯 Sight type extraction completed:`);
  console.log(`📊 Total long guns processed: ${totalLongGuns}`);
  console.log(`✅ Products with sight type: ${updatedCount}`);
  console.log(`📈 Coverage: ${coveragePercent}%`);
  
  // Show breakdown by sight type
  const sightTypeBreakdown = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.departmentNumber, '05'),
        eq(products.sightType, '')
      )
    );
  
  console.log(`📊 Sight type breakdown will be available after Algolia sync`);
}

// Run the extraction
extractSightTypes()
  .then(() => {
    console.log('✅ Sight type extraction completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sight type extraction failed:', error);
    process.exit(1);
  });

export { extractSightTypes };