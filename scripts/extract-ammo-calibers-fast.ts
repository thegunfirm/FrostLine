/**
 * Fast Ammunition Caliber Extraction
 * Extract caliber information using efficient batch operations
 */

import { db } from '../server/db';

async function extractAmmunitionCalibersFast() {
  console.log('🔧 Starting fast ammunition caliber extraction...');
  
  // Define grouped caliber patterns for efficiency
  const caliberUpdates = [
    // Common handgun calibers - grouped patterns
    {
      sql: `UPDATE products SET caliber = '9mm' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '9MM'`,
      caliber: '9mm'
    },
    {
      sql: `UPDATE products SET caliber = '.380 ACP' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '380ACP'`,
      caliber: '.380 ACP'
    },
    {
      sql: `UPDATE products SET caliber = '.40 S&W' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '40(SW|S&W)'`,
      caliber: '.40 S&W'
    },
    {
      sql: `UPDATE products SET caliber = '.45 ACP' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '45ACP'`,
      caliber: '.45 ACP'
    },
    {
      sql: `UPDATE products SET caliber = '.357 Magnum' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '357MAG'`,
      caliber: '.357 Magnum'
    },
    {
      sql: `UPDATE products SET caliber = '.38 Special' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '38(SPL|SPEC|SPECIAL)'`,
      caliber: '.38 Special'
    },
    {
      sql: `UPDATE products SET caliber = '.22 LR' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '22(LR| LR)'`,
      caliber: '.22 LR'
    },
    {
      sql: `UPDATE products SET caliber = '.22 WMR' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '22(WMR| WMR)'`,
      caliber: '.22 WMR'
    },
    {
      sql: `UPDATE products SET caliber = '.44 Magnum' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '44(MAG|MAGNUM)'`,
      caliber: '.44 Magnum'
    },
    {
      sql: `UPDATE products SET caliber = '10mm' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '10MM'`,
      caliber: '10mm'
    },
    
    // Rifle calibers - grouped patterns
    {
      sql: `UPDATE products SET caliber = '.223 Remington' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '223(REM|WIN| REM| WIN)'`,
      caliber: '.223 Remington'
    },
    {
      sql: `UPDATE products SET caliber = '5.56 NATO' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '5\\.?56(NATO|MM)'`,
      caliber: '5.56 NATO'
    },
    {
      sql: `UPDATE products SET caliber = '.308 Winchester' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '308(WIN| WIN)'`,
      caliber: '.308 Winchester'
    },
    {
      sql: `UPDATE products SET caliber = '7.62 NATO' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '7\\.?62(NATO|X51)'`,
      caliber: '7.62 NATO'
    },
    {
      sql: `UPDATE products SET caliber = '7.62x39' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '7\\.?62X39'`,
      caliber: '7.62x39'
    },
    {
      sql: `UPDATE products SET caliber = '.30-06' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '30-06'`,
      caliber: '.30-06'
    },
    {
      sql: `UPDATE products SET caliber = '.270 Winchester' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '270(WIN| WIN)'`,
      caliber: '.270 Winchester'
    },
    {
      sql: `UPDATE products SET caliber = '.243 Winchester' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '243(WIN| WIN)'`,
      caliber: '.243 Winchester'
    },
    {
      sql: `UPDATE products SET caliber = '6.5 Creedmoor' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '6\\.?5(CREED|CM|CREEDMOOR)'`,
      caliber: '6.5 Creedmoor'
    },
    {
      sql: `UPDATE products SET caliber = '.300 Winchester Magnum' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '300(WIN|WM| WIN)'`,
      caliber: '.300 Winchester Magnum'
    },
    {
      sql: `UPDATE products SET caliber = '.300 BLK' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '300(BLK|AAC| BLK)'`,
      caliber: '.300 BLK'
    },
    {
      sql: `UPDATE products SET caliber = '7mm-08' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '7MM-?08'`,
      caliber: '7mm-08'
    },
    {
      sql: `UPDATE products SET caliber = '7mm Remington Magnum' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '7MM(REM| REM)'`,
      caliber: '7mm Remington Magnum'
    },
    {
      sql: `UPDATE products SET caliber = '.25-06' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '25-06'`,
      caliber: '.25-06'
    },
    {
      sql: `UPDATE products SET caliber = '.30-30 Winchester' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '30-30'`,
      caliber: '.30-30 Winchester'
    },
    {
      sql: `UPDATE products SET caliber = '.17 HMR' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '17(HMR| HMR)'`,
      caliber: '.17 HMR'
    },
    {
      sql: `UPDATE products SET caliber = '.204 Ruger' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '204(RUG|RUGER)'`,
      caliber: '.204 Ruger'
    },
    {
      sql: `UPDATE products SET caliber = '.22-250' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '22-250'`,
      caliber: '.22-250'
    },
    {
      sql: `UPDATE products SET caliber = '6mm ARC' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '6MM(ARC| ARC)'`,
      caliber: '6mm ARC'
    },
    {
      sql: `UPDATE products SET caliber = '6.8 SPC' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '6\\.?8(SPC| SPC)'`,
      caliber: '6.8 SPC'
    },
    {
      sql: `UPDATE products SET caliber = '.350 Legend' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '350(LEG|LEGEND)'`,
      caliber: '.350 Legend'
    },
    {
      sql: `UPDATE products SET caliber = '.450 Bushmaster' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '450(BUSH|BUSHMASTER)'`,
      caliber: '.450 Bushmaster'
    },
    
    // Shotgun gauges - grouped patterns
    {
      sql: `UPDATE products SET caliber = '12 Gauge' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '12(GA|GAUGE| GA| GAUGE)'`,
      caliber: '12 Gauge'
    },
    {
      sql: `UPDATE products SET caliber = '20 Gauge' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '20(GA|GAUGE| GA| GAUGE)'`,
      caliber: '20 Gauge'
    },
    {
      sql: `UPDATE products SET caliber = '16 Gauge' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '16(GA|GAUGE| GA| GAUGE)'`,
      caliber: '16 Gauge'
    },
    {
      sql: `UPDATE products SET caliber = '28 Gauge' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '28(GA|GAUGE| GA| GAUGE)'`,
      caliber: '28 Gauge'
    },
    {
      sql: `UPDATE products SET caliber = '.410 Gauge' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '410|\\.410'`,
      caliber: '.410 Gauge'
    },
    
    // Specialty calibers - most common
    {
      sql: `UPDATE products SET caliber = '.50 BMG' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '50(BMG| BMG)'`,
      caliber: '.50 BMG'
    },
    {
      sql: `UPDATE products SET caliber = '.338 Winchester Magnum' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '338(WIN|WM| WIN)'`,
      caliber: '.338 Winchester Magnum'
    },
    {
      sql: `UPDATE products SET caliber = '.416 Barrett' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '416(BARR|BARRETT)'`,
      caliber: '.416 Barrett'
    },
    {
      sql: `UPDATE products SET caliber = '6.5 PRC' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '6\\.?5(PRC| PRC)'`,
      caliber: '6.5 PRC'
    },
    {
      sql: `UPDATE products SET caliber = '.28 Nosler' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '28(NOS|NOSLER)'`,
      caliber: '.28 Nosler'
    },
    {
      sql: `UPDATE products SET caliber = '.26 Nosler' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '26(NOS|NOSLER)'`,
      caliber: '.26 Nosler'
    },
    {
      sql: `UPDATE products SET caliber = '.45-70' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '45-70'`,
      caliber: '.45-70'
    },
    {
      sql: `UPDATE products SET caliber = '.444 Marlin' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '444(MARL|MARLIN)'`,
      caliber: '.444 Marlin'
    },
    {
      sql: `UPDATE products SET caliber = '.30 Carbine' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '30(CARB|CARBINE)'`,
      caliber: '.30 Carbine'
    },
    {
      sql: `UPDATE products SET caliber = '5.7x28' WHERE department_number = '18' AND (caliber IS NULL OR caliber = '') AND name ~* '5\\.?7X28'`,
      caliber: '5.7x28'
    }
  ];
  
  let totalUpdated = 0;
  const caliberStats: { [key: string]: number } = {};
  
  // Execute each update in sequence
  for (const update of caliberUpdates) {
    console.log(`🔍 Processing ${update.caliber}...`);
    
    try {
      const result = await db.execute(update.sql);
      const updatedCount = (result as any).rowCount || 0;
      
      if (updatedCount > 0) {
        totalUpdated += updatedCount;
        caliberStats[update.caliber] = updatedCount;
        console.log(`✅ Updated ${updatedCount} products with "${update.caliber}" caliber`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${update.caliber}:`, error);
    }
  }
  
  // Get final statistics
  const [totalResult, withCaliberResult] = await Promise.all([
    db.execute(`SELECT COUNT(*) as total FROM products WHERE department_number = '18'`),
    db.execute(`SELECT COUNT(*) as count FROM products WHERE department_number = '18' AND caliber IS NOT NULL AND caliber != ''`)
  ]);
  
  const total = (totalResult as any).rows[0].total;
  const extracted = (withCaliberResult as any).rows[0].count;
  const coverage = (extracted / total * 100).toFixed(1);
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total ammunition: ${total}`);
  console.log(`   Products with caliber: ${extracted}`);
  console.log(`   Coverage: ${coverage}%`);
  console.log(`   Products updated this run: ${totalUpdated}`);
  
  if (Object.keys(caliberStats).length > 0) {
    console.log(`\n📊 Caliber Distribution (this run):`);
    Object.entries(caliberStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([caliber, count]) => {
        console.log(`   ${caliber}: ${count} products`);
      });
  }
  
  return {
    total: parseInt(total),
    extracted: parseInt(extracted),
    updated: totalUpdated,
    coverage: coverage,
    stats: caliberStats
  };
}

// Run the extraction
extractAmmunitionCalibersFast()
  .then((result) => {
    console.log('✅ Fast ammunition caliber extraction completed');
    console.log(`🎯 Final coverage: ${result.coverage}% (${result.extracted}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fast ammunition caliber extraction failed:', error);
    process.exit(1);
  });

export { extractAmmunitionCalibersFast };