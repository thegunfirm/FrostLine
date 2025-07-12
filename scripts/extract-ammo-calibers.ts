/**
 * Extract Ammunition Caliber Data
 * Extract caliber information from ammunition product names using pattern matching
 */

import { db } from '../server/db';
import { products } from '../shared/schema';

async function extractAmmunitionCalibers() {
  console.log('🔧 Starting ammunition caliber extraction...');
  
  // Define caliber patterns based on RSR ammunition naming conventions
  const caliberPatterns = [
    // Common handgun calibers
    { pattern: '9MM', caliber: '9mm' },
    { pattern: '380ACP', caliber: '.380 ACP' },
    { pattern: '40SW', caliber: '.40 S&W' },
    { pattern: '40S&W', caliber: '.40 S&W' },
    { pattern: '45ACP', caliber: '.45 ACP' },
    { pattern: '357MAG', caliber: '.357 Magnum' },
    { pattern: '38SPL', caliber: '.38 Special' },
    { pattern: '38SPEC', caliber: '.38 Special' },
    { pattern: '38 SPECIAL', caliber: '.38 Special' },
    { pattern: '32ACP', caliber: '.32 ACP' },
    { pattern: '25ACP', caliber: '.25 ACP' },
    { pattern: '22LR', caliber: '.22 LR' },
    { pattern: '22 LR', caliber: '.22 LR' },
    { pattern: '22WMR', caliber: '.22 WMR' },
    { pattern: '22 WMR', caliber: '.22 WMR' },
    { pattern: '327FED', caliber: '.327 Federal' },
    { pattern: '44MAG', caliber: '.44 Magnum' },
    { pattern: '44 MAGNUM', caliber: '.44 Magnum' },
    { pattern: '44SPL', caliber: '.44 Special' },
    { pattern: '357SIG', caliber: '.357 SIG' },
    { pattern: '10MM', caliber: '10mm' },
    { pattern: '5.7X28', caliber: '5.7x28' },
    { pattern: '5.7X28MM', caliber: '5.7x28' },
    
    // Rifle calibers
    { pattern: '223REM', caliber: '.223 Remington' },
    { pattern: '223 REM', caliber: '.223 Remington' },
    { pattern: '223WIN', caliber: '.223 Remington' },
    { pattern: '556NATO', caliber: '5.56 NATO' },
    { pattern: '5.56NATO', caliber: '5.56 NATO' },
    { pattern: '5.56MM', caliber: '5.56 NATO' },
    { pattern: '308WIN', caliber: '.308 Winchester' },
    { pattern: '308 WIN', caliber: '.308 Winchester' },
    { pattern: '7.62NATO', caliber: '7.62 NATO' },
    { pattern: '7.62X51', caliber: '7.62x51' },
    { pattern: '7.62X39', caliber: '7.62x39' },
    { pattern: '30-06', caliber: '.30-06' },
    { pattern: '30-06SPFD', caliber: '.30-06' },
    { pattern: '270WIN', caliber: '.270 Winchester' },
    { pattern: '270 WIN', caliber: '.270 Winchester' },
    { pattern: '243WIN', caliber: '.243 Winchester' },
    { pattern: '243 WIN', caliber: '.243 Winchester' },
    { pattern: '6.5CREED', caliber: '6.5 Creedmoor' },
    { pattern: '6.5 CREEDMOOR', caliber: '6.5 Creedmoor' },
    { pattern: '6.5CM', caliber: '6.5 Creedmoor' },
    { pattern: '300WIN', caliber: '.300 Winchester Magnum' },
    { pattern: '300 WIN', caliber: '.300 Winchester Magnum' },
    { pattern: '300WM', caliber: '.300 Winchester Magnum' },
    { pattern: '300BLK', caliber: '.300 BLK' },
    { pattern: '300 BLK', caliber: '.300 BLK' },
    { pattern: '300AAC', caliber: '.300 BLK' },
    { pattern: '7MM-08', caliber: '7mm-08' },
    { pattern: '7MM08', caliber: '7mm-08' },
    { pattern: '7MMREM', caliber: '7mm Remington Magnum' },
    { pattern: '7MM REM', caliber: '7mm Remington Magnum' },
    { pattern: '25-06', caliber: '.25-06' },
    { pattern: '25-06REM', caliber: '.25-06' },
    { pattern: '30-30WIN', caliber: '.30-30 Winchester' },
    { pattern: '30-30', caliber: '.30-30 Winchester' },
    { pattern: '17HMR', caliber: '.17 HMR' },
    { pattern: '17 HMR', caliber: '.17 HMR' },
    { pattern: '204RUG', caliber: '.204 Ruger' },
    { pattern: '204 RUGER', caliber: '.204 Ruger' },
    { pattern: '22-250', caliber: '.22-250' },
    { pattern: '22-250REM', caliber: '.22-250' },
    { pattern: '6MM', caliber: '6mm' },
    { pattern: '6MMREM', caliber: '6mm Remington' },
    { pattern: '6MM REM', caliber: '6mm Remington' },
    { pattern: '6MMARC', caliber: '6mm ARC' },
    { pattern: '6MM ARC', caliber: '6mm ARC' },
    { pattern: '6.8SPC', caliber: '6.8 SPC' },
    { pattern: '6.8 SPC', caliber: '6.8 SPC' },
    { pattern: '350LEG', caliber: '.350 Legend' },
    { pattern: '350 LEGEND', caliber: '.350 Legend' },
    { pattern: '450BUSH', caliber: '.450 Bushmaster' },
    { pattern: '450 BUSHMASTER', caliber: '.450 Bushmaster' },
    { pattern: '338WIN', caliber: '.338 Winchester Magnum' },
    { pattern: '338 WIN', caliber: '.338 Winchester Magnum' },
    { pattern: '338WM', caliber: '.338 Winchester Magnum' },
    { pattern: '50BMG', caliber: '.50 BMG' },
    { pattern: '50 BMG', caliber: '.50 BMG' },
    { pattern: '416BARR', caliber: '.416 Barrett' },
    { pattern: '416 BARRETT', caliber: '.416 Barrett' },
    { pattern: '6.5PRC', caliber: '6.5 PRC' },
    { pattern: '6.5 PRC', caliber: '6.5 PRC' },
    { pattern: '28NOS', caliber: '.28 Nosler' },
    { pattern: '28 NOSLER', caliber: '.28 Nosler' },
    { pattern: '26NOS', caliber: '.26 Nosler' },
    { pattern: '26 NOSLER', caliber: '.26 Nosler' },
    { pattern: '300PRC', caliber: '.300 PRC' },
    { pattern: '300 PRC', caliber: '.300 PRC' },
    { pattern: '7PRC', caliber: '7mm PRC' },
    { pattern: '7MM PRC', caliber: '7mm PRC' },
    { pattern: '277SIG', caliber: '.277 SIG' },
    { pattern: '277 SIG', caliber: '.277 SIG' },
    { pattern: '8.6BLK', caliber: '8.6 Blackout' },
    { pattern: '8.6 BLACKOUT', caliber: '8.6 Blackout' },
    { pattern: '375H&H', caliber: '.375 H&H' },
    { pattern: '375 H&H', caliber: '.375 H&H' },
    { pattern: '458SOCOM', caliber: '.458 SOCOM' },
    { pattern: '458 SOCOM', caliber: '.458 SOCOM' },
    { pattern: '5.45X39', caliber: '5.45x39' },
    { pattern: '5.45 X39', caliber: '5.45x39' },
    
    // Shotgun gauges
    { pattern: '12GA', caliber: '12 Gauge' },
    { pattern: '12 GA', caliber: '12 Gauge' },
    { pattern: '12 GAUGE', caliber: '12 Gauge' },
    { pattern: '20GA', caliber: '20 Gauge' },
    { pattern: '20 GA', caliber: '20 Gauge' },
    { pattern: '20 GAUGE', caliber: '20 Gauge' },
    { pattern: '16GA', caliber: '16 Gauge' },
    { pattern: '16 GA', caliber: '16 Gauge' },
    { pattern: '16 GAUGE', caliber: '16 Gauge' },
    { pattern: '28GA', caliber: '28 Gauge' },
    { pattern: '28 GA', caliber: '28 Gauge' },
    { pattern: '28 GAUGE', caliber: '28 Gauge' },
    { pattern: '410GA', caliber: '.410 Gauge' },
    { pattern: '410 GA', caliber: '.410 Gauge' },
    { pattern: '410 GAUGE', caliber: '.410 Gauge' },
    { pattern: '.410', caliber: '.410 Gauge' },
    
    // Specialty calibers
    { pattern: '45-70', caliber: '.45-70' },
    { pattern: '45-70GOVT', caliber: '.45-70' },
    { pattern: '45 LONG COLT', caliber: '.45 Long Colt' },
    { pattern: '45LC', caliber: '.45 Long Colt' },
    { pattern: '454CAS', caliber: '.454 Casull' },
    { pattern: '454 CASULL', caliber: '.454 Casull' },
    { pattern: '444MARL', caliber: '.444 Marlin' },
    { pattern: '444 MARLIN', caliber: '.444 Marlin' },
    { pattern: '30CARB', caliber: '.30 Carbine' },
    { pattern: '30 CARBINE', caliber: '.30 Carbine' },
    { pattern: '327FED', caliber: '.327 Federal' },
    { pattern: '327 FEDERAL', caliber: '.327 Federal' },
    { pattern: '35REM', caliber: '.35 Remington' },
    { pattern: '35 REMINGTON', caliber: '.35 Remington' },
    { pattern: '360BUCK', caliber: '.360 Buckhammer' },
    { pattern: '360 BUCKHAMMER', caliber: '.360 Buckhammer' },
    { pattern: '400LEG', caliber: '.400 Legend' },
    { pattern: '400 LEGEND', caliber: '.400 Legend' },
    { pattern: '280REM', caliber: '.280 Remington' },
    { pattern: '280 REMINGTON', caliber: '.280 Remington' },
    { pattern: '280ACK', caliber: '.280 Ackley' },
    { pattern: '280 ACKLEY', caliber: '.280 Ackley' },
    { pattern: '257WBY', caliber: '.257 Weatherby' },
    { pattern: '257 WEATHERBY', caliber: '.257 Weatherby' }
  ];
  
  let totalUpdated = 0;
  const caliberStats: { [key: string]: number } = {};
  
  // Process each caliber pattern
  for (const pattern of caliberPatterns) {
    console.log(`🔍 Processing ${pattern.caliber} patterns...`);
    
    const sql = `
      UPDATE products 
      SET caliber = '${pattern.caliber}' 
      WHERE department_number = '18' 
      AND (caliber IS NULL OR caliber = '')
      AND name ~* '${pattern.pattern}'
    `;
    
    try {
      const result = await db.execute(sql);
      const updatedCount = (result as any).rowCount || 0;
      totalUpdated += updatedCount;
      
      if (updatedCount > 0) {
        caliberStats[pattern.caliber] = (caliberStats[pattern.caliber] || 0) + updatedCount;
        console.log(`✅ Updated ${updatedCount} products with "${pattern.caliber}" caliber`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${pattern.caliber}:`, error);
    }
  }
  
  // Get final statistics
  const totalResult = await db.execute(`
    SELECT COUNT(*) as total 
    FROM products 
    WHERE department_number = '18'
  `);
  
  const withCaliberResult = await db.execute(`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE department_number = '18' 
    AND caliber IS NOT NULL 
    AND caliber != ''
  `);
  
  const total = (totalResult as any).rows[0].total;
  const extracted = (withCaliberResult as any).rows[0].count;
  const coverage = (extracted / total * 100).toFixed(1);
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`   Total ammunition: ${total}`);
  console.log(`   Products with caliber: ${extracted}`);
  console.log(`   Coverage: ${coverage}%`);
  console.log(`   Products updated this run: ${totalUpdated}`);
  
  console.log(`\n📊 Caliber Distribution (this run):`);
  Object.entries(caliberStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([caliber, count]) => {
      console.log(`   ${caliber}: ${count} products`);
    });
  
  // Show current caliber distribution in database
  const distributionResult = await db.execute(`
    SELECT caliber, COUNT(*) as count
    FROM products 
    WHERE department_number = '18' 
    AND caliber IS NOT NULL 
    AND caliber != ''
    GROUP BY caliber
    ORDER BY count DESC
    LIMIT 20
  `);
  
  console.log(`\n📊 Top 20 Caliber Distribution in Database:`);
  (distributionResult as any).rows.forEach((row: any) => {
    console.log(`   ${row.caliber}: ${row.count} products`);
  });
  
  return {
    total: parseInt(total),
    extracted: parseInt(extracted),
    updated: totalUpdated,
    coverage: coverage,
    stats: caliberStats
  };
}

// Run the extraction
extractAmmunitionCalibers()
  .then((result) => {
    console.log('✅ Ammunition caliber extraction completed');
    console.log(`🎯 Final coverage: ${result.coverage}% (${result.extracted}/${result.total} products)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ammunition caliber extraction failed:', error);
    process.exit(1);
  });

export { extractAmmunitionCalibers };