/**
 * Extract Optics Type and Zoom Data
 * Extract type and zoom information from optics product names using pattern matching
 */

import { db } from '../server/db';

async function extractOpticsTypeAndZoom() {
  console.log('🔧 Starting optics type and zoom extraction...');
  
  // Define optics type patterns based on RSR naming conventions
  const typeUpdates = [
    {
      sql: `UPDATE products SET sight_type = 'Red Dot' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'RED DOT'`,
      type: 'Red Dot'
    },
    {
      sql: `UPDATE products SET sight_type = 'Reflex' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'REFLEX'`,
      type: 'Reflex'
    },
    {
      sql: `UPDATE products SET sight_type = 'Scope' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'SCOPE'`,
      type: 'Scope'
    },
    {
      sql: `UPDATE products SET sight_type = 'Thermal' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'THERMAL'`,
      type: 'Thermal'
    },
    {
      sql: `UPDATE products SET sight_type = 'Binocular' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'BINOCULAR'`,
      type: 'Binocular'
    },
    {
      sql: `UPDATE products SET sight_type = 'Magnifier' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'MAGNIFIER'`,
      type: 'Magnifier'
    },
    {
      sql: `UPDATE products SET sight_type = 'Laser' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'LASER'`,
      type: 'Laser'
    },
    {
      sql: `UPDATE products SET sight_type = 'Sight' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* '(SIGHT|IRON SIGHT)' AND name !~* '(RED DOT|REFLEX|SCOPE|THERMAL|BINOCULAR|MAGNIFIER|LASER)'`,
      type: 'Sight'
    },
    {
      sql: `UPDATE products SET sight_type = 'Prism' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'PRISM'`,
      type: 'Prism'
    },
    {
      sql: `UPDATE products SET sight_type = 'Monocular' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'MONO(CULAR)?'`,
      type: 'Monocular'
    },
    {
      sql: `UPDATE products SET sight_type = 'Night Vision' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* 'NIGHT (VSN|VISION)'`,
      type: 'Night Vision'
    },
    {
      sql: `UPDATE products SET sight_type = 'Range Finder' WHERE department_number = '08' AND (sight_type IS NULL OR sight_type = '') AND name ~* '(RNG FNDR|RANGE FINDER|RANGEFINDER|LRF)'`,
      type: 'Range Finder'
    }
  ];
  
  let totalTypeUpdated = 0;
  const typeStats: { [key: string]: number } = {};
  
  // Execute type updates
  console.log('📋 Extracting optics types...');
  for (const update of typeUpdates) {
    console.log(`🔍 Processing ${update.type}...`);
    
    try {
      const result = await db.execute(update.sql);
      const updatedCount = (result as any).rowCount || 0;
      
      if (updatedCount > 0) {
        totalTypeUpdated += updatedCount;
        typeStats[update.type] = updatedCount;
        console.log(`✅ Updated ${updatedCount} products with "${update.type}" type`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${update.type}:`, error);
    }
  }
  
  // Define zoom/magnification patterns
  const zoomUpdates = [
    // Variable zoom patterns (most common)
    {
      sql: `UPDATE products SET frame_size = '1-4X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-4X'`,
      zoom: '1-4X'
    },
    {
      sql: `UPDATE products SET frame_size = '1-6X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-6X'`,
      zoom: '1-6X'
    },
    {
      sql: `UPDATE products SET frame_size = '1-8X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-8X'`,
      zoom: '1-8X'
    },
    {
      sql: `UPDATE products SET frame_size = '1-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1-10X'`,
      zoom: '1-10X'
    },
    {
      sql: `UPDATE products SET frame_size = '2-7X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2-7X'`,
      zoom: '2-7X'
    },
    {
      sql: `UPDATE products SET frame_size = '2-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2-10X'`,
      zoom: '2-10X'
    },
    {
      sql: `UPDATE products SET frame_size = '3-9X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-9X'`,
      zoom: '3-9X'
    },
    {
      sql: `UPDATE products SET frame_size = '3-12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-12X'`,
      zoom: '3-12X'
    },
    {
      sql: `UPDATE products SET frame_size = '3-15X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-15X'`,
      zoom: '3-15X'
    },
    {
      sql: `UPDATE products SET frame_size = '3-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3-18X'`,
      zoom: '3-18X'
    },
    {
      sql: `UPDATE products SET frame_size = '4-12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4-12X'`,
      zoom: '4-12X'
    },
    {
      sql: `UPDATE products SET frame_size = '4-16X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4-16X'`,
      zoom: '4-16X'
    },
    {
      sql: `UPDATE products SET frame_size = '5-20X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '5-20X'`,
      zoom: '5-20X'
    },
    {
      sql: `UPDATE products SET frame_size = '5-25X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '5-25X'`,
      zoom: '5-25X'
    },
    {
      sql: `UPDATE products SET frame_size = '6-24X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '6-24X'`,
      zoom: '6-24X'
    },
    {
      sql: `UPDATE products SET frame_size = '2.5-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-10X'`,
      zoom: '2.5-10X'
    },
    {
      sql: `UPDATE products SET frame_size = '2.5-20X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-20X'`,
      zoom: '2.5-20X'
    },
    {
      sql: `UPDATE products SET frame_size = '3.5-10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.5-10X'`,
      zoom: '3.5-10X'
    },
    {
      sql: `UPDATE products SET frame_size = '3.6-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.6-18X'`,
      zoom: '3.6-18X'
    },
    {
      sql: `UPDATE products SET frame_size = '4.5-18X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4\\.5-18X'`,
      zoom: '4.5-18X'
    },
    {
      sql: `UPDATE products SET frame_size = '4.5-29X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4\\.5-29X'`,
      zoom: '4.5-29X'
    },
    {
      sql: `UPDATE products SET frame_size = '1.5-5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '1\\.5-5X'`,
      zoom: '1.5-5X'
    },
    {
      sql: `UPDATE products SET frame_size = '2.5-12.5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2\\.5-12\\.5X'`,
      zoom: '2.5-12.5X'
    },
    {
      sql: `UPDATE products SET frame_size = '8-24X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '8-24X'`,
      zoom: '8-24X'
    },
    {
      sql: `UPDATE products SET frame_size = '20-60X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '20-60X'`,
      zoom: '20-60X'
    },
    
    // Fixed zoom patterns
    {
      sql: `UPDATE products SET frame_size = '1X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b1X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '1X'
    },
    {
      sql: `UPDATE products SET frame_size = '2X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b2X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '2X'
    },
    {
      sql: `UPDATE products SET frame_size = '3X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b3X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '3X'
    },
    {
      sql: `UPDATE products SET frame_size = '4X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b4X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '4X'
    },
    {
      sql: `UPDATE products SET frame_size = '5X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b5X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '5X'
    },
    {
      sql: `UPDATE products SET frame_size = '6X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b6X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '6X'
    },
    {
      sql: `UPDATE products SET frame_size = '7X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b7X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '7X'
    },
    {
      sql: `UPDATE products SET frame_size = '8X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b8X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '8X'
    },
    {
      sql: `UPDATE products SET frame_size = '10X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b10X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '10X'
    },
    {
      sql: `UPDATE products SET frame_size = '12X' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '\\b12X\\b' AND name !~* '[0-9]+-[0-9]+X'`,
      zoom: '12X'
    },
    
    // Special zoom patterns for ACOG and other specialized optics
    {
      sql: `UPDATE products SET frame_size = '2X20' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '2X20'`,
      zoom: '2X20'
    },
    {
      sql: `UPDATE products SET frame_size = '3.5X35' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3\\.5X35'`,
      zoom: '3.5X35'
    },
    {
      sql: `UPDATE products SET frame_size = '4X32' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4X32'`,
      zoom: '4X32'
    },
    {
      sql: `UPDATE products SET frame_size = '3X24' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '3X24'`,
      zoom: '3X24'
    },
    {
      sql: `UPDATE products SET frame_size = '4X24' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND name ~* '4X24'`,
      zoom: '4X24'
    },
    
    // No magnification for red dots, reflex, etc
    {
      sql: `UPDATE products SET frame_size = 'No Magnification' WHERE department_number = '08' AND (frame_size IS NULL OR frame_size = '') AND sight_type IN ('Red Dot', 'Reflex', 'Laser') AND name !~* '[0-9]+X'`,
      zoom: 'No Magnification'
    }
  ];
  
  let totalZoomUpdated = 0;
  const zoomStats: { [key: string]: number } = {};
  
  // Execute zoom updates
  console.log('🔍 Extracting zoom levels...');
  for (const update of zoomUpdates) {
    console.log(`🔍 Processing ${update.zoom}...`);
    
    try {
      const result = await db.execute(update.sql);
      const updatedCount = (result as any).rowCount || 0;
      
      if (updatedCount > 0) {
        totalZoomUpdated += updatedCount;
        zoomStats[update.zoom] = updatedCount;
        console.log(`✅ Updated ${updatedCount} products with "${update.zoom}" zoom`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${update.zoom}:`, error);
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
  console.log(`   Type updates this run: ${totalTypeUpdated}`);
  console.log(`   Zoom updates this run: ${totalZoomUpdated}`);
  
  if (Object.keys(typeStats).length > 0) {
    console.log(`\n📊 Type Distribution (this run):`);
    Object.entries(typeStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count} products`);
      });
  }
  
  if (Object.keys(zoomStats).length > 0) {
    console.log(`\n📊 Zoom Distribution (this run):`);
    Object.entries(zoomStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([zoom, count]) => {
        console.log(`   ${zoom}: ${count} products`);
      });
  }
  
  return {
    total: parseInt(total),
    extractedType: parseInt(extractedType),
    extractedZoom: parseInt(extractedZoom),
    typeUpdated: totalTypeUpdated,
    zoomUpdated: totalZoomUpdated,
    typeCoverage: typeCoverage,
    zoomCoverage: zoomCoverage,
    typeStats: typeStats,
    zoomStats: zoomStats
  };
}

// Run the extraction
extractOpticsTypeAndZoom()
  .then((result) => {
    console.log('✅ Optics type and zoom extraction completed');
    console.log(`🎯 Type coverage: ${result.typeCoverage}% (${result.extractedType}/${result.total} products)`);
    console.log(`🎯 Zoom coverage: ${result.zoomCoverage}% (${result.extractedZoom}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Optics type and zoom extraction failed:', error);
    process.exit(1);
  });

export { extractOpticsTypeAndZoom };