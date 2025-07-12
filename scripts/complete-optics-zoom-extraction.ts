/**
 * Complete Optics Zoom Extraction
 * Fast completion of zoom extraction for remaining optics
 */

import { db } from '../server/db';

async function completeOpticsZoomExtraction() {
  console.log('🔧 Completing optics zoom extraction...');
  
  // Batch zoom updates for efficiency
  const zoomUpdates = [
    // Variable zoom patterns (priority)
    `UPDATE products SET frame_size = '3-9X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-9X'`,
    `UPDATE products SET frame_size = '4-16X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4-16X'`,
    `UPDATE products SET frame_size = '5-25X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '5-25X'`,
    `UPDATE products SET frame_size = '6-24X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '6-24X'`,
    `UPDATE products SET frame_size = '1-6X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-6X'`,
    `UPDATE products SET frame_size = '1-8X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-8X'`,
    `UPDATE products SET frame_size = '1-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-10X'`,
    `UPDATE products SET frame_size = '2-7X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2-7X'`,
    `UPDATE products SET frame_size = '2-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2-10X'`,
    `UPDATE products SET frame_size = '3-12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-12X'`,
    `UPDATE products SET frame_size = '3-15X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-15X'`,
    `UPDATE products SET frame_size = '3-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-18X'`,
    `UPDATE products SET frame_size = '4-12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4-12X'`,
    `UPDATE products SET frame_size = '5-20X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '5-20X'`,
    `UPDATE products SET frame_size = '8-24X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '8-24X'`,
    
    // Decimal zoom patterns
    `UPDATE products SET frame_size = '2.5-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-10X'`,
    `UPDATE products SET frame_size = '2.5-20X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-20X'`,
    `UPDATE products SET frame_size = '3.5-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.5-10X'`,
    `UPDATE products SET frame_size = '3.6-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.6-18X'`,
    `UPDATE products SET frame_size = '4.5-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4\\.5-18X'`,
    `UPDATE products SET frame_size = '1.5-5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1\\.5-5X'`,
    `UPDATE products SET frame_size = '2.5-12.5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-12\\.5X'`,
    
    // Fixed zoom patterns
    `UPDATE products SET frame_size = '1X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b1X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '2X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b2X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '3X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b3X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '4X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b4X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b5X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '6X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b6X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '7X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b7X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '8X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b8X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b10X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    `UPDATE products SET frame_size = '12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b12X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
    
    // ACOG and specialized patterns
    `UPDATE products SET frame_size = '2X20' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2X20'`,
    `UPDATE products SET frame_size = '3.5X35' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.5X35'`,
    `UPDATE products SET frame_size = '4X32' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4X32'`,
    `UPDATE products SET frame_size = '3X24' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3X24'`,
    `UPDATE products SET frame_size = '4X24' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4X24'`,
    
    // No magnification for red dots, reflex, etc
    `UPDATE products SET frame_size = 'No Magnification' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND sight_type IN ('Red Dot', 'Reflex', 'Laser') AND name !~* '[0-9]+X'`
  ];
  
  let totalUpdated = 0;
  
  // Execute zoom updates in batches
  for (let i = 0; i < zoomUpdates.length; i++) {
    const sql = zoomUpdates[i];
    console.log(`🔍 Processing zoom update ${i + 1}/${zoomUpdates.length}...`);
    
    try {
      const result = await db.execute(sql);
      const updatedCount = (result as any).rowCount || 0;
      totalUpdated += updatedCount;
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} products`);
      }
    } catch (error) {
      console.error(`❌ Error in update ${i + 1}:`, error);
    }
  }
  
  // Get final statistics
  const [totalResult, withTypeResult, withZoomResult] = await Promise.all([
    db.execute(`SELECT COUNT(*) as total FROM products WHERE department_number = '08'`),
    db.execute(`SELECT COUNT(*) as count FROM products WHERE department_number = '08' AND sight_type IS NOT NULL AND sight_type != ''`),
    db.execute(`SELECT COUNT(*) as count FROM products WHERE department_number = '08' AND frame_size IS NOT NULL AND frame_size != ''`)
  ]);
  
  const total = (totalResult as any).rows[0].total;
  const extractedType = (withTypeResult as any).rows[0].count;
  const extractedZoom = (withZoomResult as any).rows[0].count;
  const typeCoverage = (extractedType / total * 100).toFixed(1);
  const zoomCoverage = (extractedZoom / total * 100).toFixed(1);
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total optics: ${total}`);
  console.log(`   Products with type: ${extractedType} (${typeCoverage}%)`);
  console.log(`   Products with zoom: ${extractedZoom} (${zoomCoverage}%)`);
  console.log(`   Zoom updates this run: ${totalUpdated}`);
  
  // Show zoom distribution
  const zoomDistribution = await db.execute(`
    SELECT frame_size, COUNT(*) as count
    FROM products 
    WHERE department_number = '08' 
    AND frame_size IS NOT NULL 
    AND frame_size != ''
    GROUP BY frame_size
    ORDER BY count DESC
    LIMIT 15
  `);
  
  console.log(`\n📊 Top 15 Zoom Distribution:`);
  (zoomDistribution as any).rows.forEach((row: any) => {
    console.log(`   ${row.frame_size}: ${row.count} products`);
  });
  
  return {
    total: parseInt(total),
    extractedType: parseInt(extractedType),
    extractedZoom: parseInt(extractedZoom),
    updated: totalUpdated,
    typeCoverage: typeCoverage,
    zoomCoverage: zoomCoverage
  };
}

// Run the completion
completeOpticsZoomExtraction()
  .then((result) => {
    console.log('✅ Optics zoom extraction completed');
    console.log(`🎯 Type coverage: ${result.typeCoverage}% (${result.extractedType}/${result.total} products)`);
    console.log(`🎯 Zoom coverage: ${result.zoomCoverage}% (${result.extractedZoom}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Optics zoom extraction failed:', error);
    process.exit(1);
  });

export { completeOpticsZoomExtraction };