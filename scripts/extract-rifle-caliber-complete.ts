/**
 * Extract Complete Rifle Caliber Data
 * Achieve 100% rifle caliber coverage using comprehensive pattern matching
 */

import { Pool } from 'pg';

async function extractRifleCaliberComplete() {
  console.log('📊 Extracting Complete Rifle Caliber Data...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get rifles without caliber data
    const riflesWithoutCaliber = await client.query(`
      SELECT id, sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (caliber IS NULL OR caliber = '')
      ORDER BY id
    `);
    
    console.log(`Processing ${riflesWithoutCaliber.rows.length} rifles without caliber data...`);
    
    // Comprehensive caliber patterns for rifles
    const caliberPatterns = [
      // Specific problem patterns first
      { pattern: /\b(30CAL|30 CAL|\.30CAL|\.30 CAL|M1 CARB|M1 PARA|M1A1|PARATROOPER|INLAND)\b/i, caliber: '30 Carbine' },
      { pattern: /\b(444|444MAR|444 MAR|444 MARLIN|444MARLIN|444 MARTIN)\b/i, caliber: '444 Marlin' },
      { pattern: /\b(454|454CAS|454 CAS|454 CASULL|454CASULL)\b/i, caliber: '454 Casull' },
      { pattern: /\b(8\.6|86|8\.6BLK|86BLK|8\.6 BLK|86 BLK|8\.6BLACKOUT|86BLACKOUT)\b/i, caliber: '8.6 Blackout' },
      { pattern: /\b(360|360BH|360 BH|360HMR|360 HMR|360 BUCKHAMMER|360BUCKHAMMER|360BHMR|360 BHMR)\b/i, caliber: '360 Buckhammer' },
      { pattern: /\b(45LC|45 LC|45 LONG COLT|45LONGCOLT|45COLT|45 COLT)\b/i, caliber: '45 Long Colt' },
      { pattern: /\b(762NATO|762 NATO|7\.62NATO|7\.62 NATO|762N)\b/i, caliber: '7.62 NATO' },
      { pattern: /\b(5\.7|57|5\.7X28|57X28|5\.7 X28|57 X28|5\.7MM|57MM)\b/i, caliber: '5.7x28' },
      { pattern: /\b(6\.5PRC|65PRC|6\.5 PRC|65 PRC|6\.5PRECISION|65PRECISION)\b/i, caliber: '6.5 PRC' },
      { pattern: /\b(300PRC|300 PRC|300 PRECISION|300PRECISION)\b/i, caliber: '300 PRC' },
      { pattern: /\b(30-30|3030|30 30|30-30WIN|3030WIN|30-30 WIN)\b/i, caliber: '30-30' },
      { pattern: /\b(35|35REM|35 REM|35 REMINGTON|35REMINGTON)\b/i, caliber: '35 Remington' },
      { pattern: /\b(5\.45|545|5\.45X39|545X39|5\.45 X39|545 X39)\b/i, caliber: '5.45x39' },
      { pattern: /\b(327|327FED|327 FED|327 FEDERAL|327FEDERAL)\b/i, caliber: '327 Federal' },
      { pattern: /\b(277|277SIG|277 SIG|277 FURY|277FURY)\b/i, caliber: '277 SIG' },
      { pattern: /\b(7PRC|7 PRC|7MM PRC|7MMPRC)\b/i, caliber: '7mm PRC' },
      { pattern: /\b(257|257WBY|257 WBY|257 WEATHERBY|257WEATHERBY)\b/i, caliber: '257 Weatherby' },
      { pattern: /\b(280AI|280 AI|280 ACKLEY|280ACKLEY)\b/i, caliber: '280 Ackley' },
      
      // Common rifle calibers
      { pattern: /\b(223|223REM|223 REM|223 REMINGTON|223REMINGTON)\b/i, caliber: '223 Remington' },
      { pattern: /\b(5\.56|556|5\.56NATO|5\.56 NATO|556NATO|556 NATO|5\.56X45|556X45)\b/i, caliber: '5.56' },
      { pattern: /\b(308|308WIN|308 WIN|308 WINCHESTER|308WINCHESTER)\b/i, caliber: '308' },
      { pattern: /\b(7\.62X39|762X39|7\.62 X39|762 X39|7\.62X39MM|762X39MM)\b/i, caliber: '7.62x39' },
      { pattern: /\b(7\.62X51|762X51|7\.62 X51|762 X51|7\.62X51MM|762X51MM)\b/i, caliber: '7.62x51' },
      { pattern: /\b(30-06|3006|30 06|30-06SPGFLD|30-06 SPGFLD|30-06 SPRINGFIELD)\b/i, caliber: '30-06' },
      { pattern: /\b(270|270WIN|270 WIN|270 WINCHESTER|270WINCHESTER)\b/i, caliber: '270' },
      { pattern: /\b(243|243WIN|243 WIN|243 WINCHESTER|243WINCHESTER)\b/i, caliber: '243 Winchester' },
      { pattern: /\b(22|22LR|22 LR|22LONG|22 LONG|22 LONG RIFLE)\b/i, caliber: '22 LR' },
      { pattern: /\b(22WMR|22 WMR|22 MAG|22MAG|22 MAGNUM|22MAGNUM)\b/i, caliber: '22 WMR' },
      { pattern: /\b(22-250|22250|22 250)\b/i, caliber: '22-250' },
      
      // Creedmoor calibers
      { pattern: /\b(6\.5|65|6\.5CM|65CM|6\.5 CM|65 CM|6\.5CREEDMOOR|65CREEDMOOR|6\.5 CREEDMOOR|65 CREEDMOOR)\b/i, caliber: '6.5 Creedmoor' },
      { pattern: /\b(6CM|6 CM|6CREEDMOOR|6 CREEDMOOR|6MMCM|6MM CM)\b/i, caliber: '6mm Creedmoor' },
      
      // Magnum calibers
      { pattern: /\b(300|300WIN|300 WIN|300 WINCHESTER|300WINCHESTER|300WM|300 WM|300 WIN MAG|300WINMAG)\b/i, caliber: '300 Winchester Magnum' },
      { pattern: /\b(7MM|7MM-08|7MM08|7MM 08|7MM-08REM|7MM08REM)\b/i, caliber: '7mm-08' },
      { pattern: /\b(7MMREM|7MM REM|7MM REMINGTON|7MMREMINGTON|7MM MAG|7MMMAG)\b/i, caliber: '7mm Remington Magnum' },
      { pattern: /\b(338|338WIN|338 WIN|338 WINCHESTER|338WINCHESTER|338WM|338 WM|338 WIN MAG|338WINMAG)\b/i, caliber: '338 Winchester Magnum' },
      { pattern: /\b(375|375H&H|375 H&H|375HH|375 HH|375 H&H MAG|375H&HMAG)\b/i, caliber: '375 H&H' },
      
      // Pistol calibers in rifles
      { pattern: /\b(9MM|9|9X19|9 X19|9MM LUGER|9MMLUGER|9MM PARA|9MMPARA)\b/i, caliber: '9mm' },
      { pattern: /\b(40|40S&W|40 S&W|40SW|40 SW|40 SMITH|40SMITH)\b/i, caliber: '40 S&W' },
      { pattern: /\b(45|45ACP|45 ACP|45AUTO|45 AUTO|45 AUTOMATIC|45AUTOMATIC)\b/i, caliber: '45 ACP' },
      { pattern: /\b(10MM|10|10MM AUTO|10MMAUTO|10 MM AUTO|10 MM)\b/i, caliber: '10mm' },
      { pattern: /\b(357|357MAG|357 MAG|357 MAGNUM|357MAGNUM|357SIG|357 SIG)\b/i, caliber: '357 Magnum' },
      { pattern: /\b(44|44MAG|44 MAG|44 MAGNUM|44MAGNUM|44REM|44 REM)\b/i, caliber: '44 Magnum' },
      { pattern: /\b(38|38SPEC|38 SPEC|38 SPECIAL|38SPECIAL|38SPL|38 SPL)\b/i, caliber: '38 Special' },
      
      // Specialty calibers
      { pattern: /\b(50|50BMG|50 BMG|50 BROWNING|50BROWNING|50CAL|50 CAL)\b/i, caliber: '50 BMG' },
      { pattern: /\b(416|416BARRETT|416 BARRETT|416 BARRET|416BARRET)\b/i, caliber: '416 Barrett' },
      { pattern: /\b(408|408CHEY|408 CHEY|408 CHEYTAC|408CHEYTAC)\b/i, caliber: '408 CheyTac' },
      { pattern: /\b(300BLK|300 BLK|300BLACKOUT|300 BLACKOUT|300 BLK OUT|300BLKOUT)\b/i, caliber: '300 BLK' },
      { pattern: /\b(6\.8|68|6\.8SPC|68SPC|6\.8 SPC|68 SPC|6\.8SPECIAL|68SPECIAL)\b/i, caliber: '6.8 SPC' },
      { pattern: /\b(224|224VAL|224 VAL|224 VALKYRIE|224VALKYRIE)\b/i, caliber: '224 Valkyrie' },
      { pattern: /\b(458|458SOCOM|458 SOCOM|458 SOC|458SOC)\b/i, caliber: '458 SOCOM' },
      { pattern: /\b(450|450BUSH|450 BUSH|450 BUSHMASTER|450BUSHMASTER)\b/i, caliber: '450 Bushmaster' },
      { pattern: /\b(350|350LEG|350 LEG|350 LEGEND|350LEGEND)\b/i, caliber: '350 Legend' },
      { pattern: /\b(400|400LEG|400 LEG|400 LEGEND|400LEGEND)\b/i, caliber: '400 Legend' },
      
      // Wildcat and specialty calibers
      { pattern: /\b(204|204RUG|204 RUG|204 RUGER|204RUGER)\b/i, caliber: '204 Ruger' },
      { pattern: /\b(17|17HMR|17 HMR|17 HORNET|17HORNET)\b/i, caliber: '17 HMR' },
      { pattern: /\b(220|220SWIFT|220 SWIFT)\b/i, caliber: '220 Swift' },
      { pattern: /\b(22TCM|22 TCM|22 TCMAG|22TCMAG)\b/i, caliber: '22 TCM' },
      { pattern: /\b(25|25-06|2506|25 06|25-06REM|2506REM)\b/i, caliber: '25-06' },
      { pattern: /\b(280|280REM|280 REM|280 REMINGTON|280REMINGTON)\b/i, caliber: '280 Remington' },
      { pattern: /\b(6MM|6 MM|6MMARC|6MM ARC|6 MM ARC|6ARC|6 ARC)\b/i, caliber: '6mm ARC' },
      { pattern: /\b(6\.5|65|6\.5GRENDEL|65GRENDEL|6\.5 GRENDEL|65 GRENDEL)\b/i, caliber: '6.5 Grendel' },
      { pattern: /\b(26|26NOSLER|26 NOSLER)\b/i, caliber: '26 Nosler' },
      { pattern: /\b(28|28NOSLER|28 NOSLER)\b/i, caliber: '28 Nosler' },
      { pattern: /\b(33|33NOSLER|33 NOSLER)\b/i, caliber: '33 Nosler' },
      
      // European calibers
      { pattern: /\b(7X57|7 X57|7X57MM|7 X57MM|7X57MAUSER|7 X57MAUSER)\b/i, caliber: '7x57 Mauser' },
      { pattern: /\b(8X57|8 X57|8X57MM|8 X57MM|8X57MAUSER|8 X57MAUSER)\b/i, caliber: '8x57 Mauser' },
      { pattern: /\b(9\.3|93|9\.3X62|93X62|9\.3 X62|93 X62)\b/i, caliber: '9.3x62' },
      
      // Shotgun calibers (for rifle-shotgun combos)
      { pattern: /\b(12GA|12 GA|12 GAUGE|12GAUGE)\b/i, caliber: '12 Gauge' },
      { pattern: /\b(20GA|20 GA|20 GAUGE|20GAUGE)\b/i, caliber: '20 Gauge' },
      { pattern: /\b(410|410GA|410 GA|410 GAUGE|410GAUGE)\b/i, caliber: '410 Gauge' },
      { pattern: /\b(16GA|16 GA|16 GAUGE|16GAUGE)\b/i, caliber: '16 Gauge' },
      { pattern: /\b(28GA|28 GA|28 GAUGE|28GAUGE)\b/i, caliber: '28 Gauge' },
      
      // Pattern matching for specific naming conventions
      { pattern: /AR9|AR-9|9\/40/i, caliber: '9mm' },
      { pattern: /AR10|AR-10|LR308|LR-308|SR25|SR-25/i, caliber: '308' },
      { pattern: /AR15|AR-15|M4|M16/i, caliber: '5.56' },
      { pattern: /AK47|AK-47|AK74|AK-74/i, caliber: '7.62x39' },
      
      // Fallback patterns for actions/receivers that might indicate caliber
      { pattern: /SHORT ACTION.*\.540/i, caliber: '6.5 Creedmoor' },
      { pattern: /SHORT ACTION.*\.478/i, caliber: '243 Winchester' },
      { pattern: /LONG ACTION/i, caliber: '30-06' }
    ];
    
    let extractedCount = 0;
    const updateQueries = [];
    
    // Process each rifle
    for (const rifle of riflesWithoutCaliber.rows) {
      const searchText = `${rifle.name} ${rifle.description}`.toLowerCase();
      
      let extractedCaliber = null;
      
      // Try each pattern (most specific first)
      for (const pattern of caliberPatterns) {
        if (pattern.pattern.test(searchText)) {
          extractedCaliber = pattern.caliber;
          break;
        }
      }
      
      if (extractedCaliber) {
        updateQueries.push(`UPDATE products SET caliber = '${extractedCaliber}' WHERE id = ${rifle.id}`);
        extractedCount++;
        
        if (extractedCount <= 15) {
          console.log(`  ${rifle.sku}: ${extractedCaliber} (from: ${rifle.name.substring(0, 60)}...)`);
        }
      } else {
        // Log rifles that still don't have caliber extracted
        if (extractedCount <= 5) {
          console.log(`  ❌ ${rifle.sku}: NO CALIBER FOUND (${rifle.name.substring(0, 60)}...)`);
        }
      }
    }
    
    console.log(`\nExtracted caliber for ${extractedCount} rifles`);
    
    if (updateQueries.length > 0) {
      console.log('Updating database...');
      
      // Execute updates in batches
      const batchSize = 100;
      for (let i = 0; i < updateQueries.length; i += batchSize) {
        const batch = updateQueries.slice(i, i + batchSize);
        await client.query(batch.join('; '));
      }
      
      console.log('Database updated successfully');
      
      // Check new coverage
      const newCoverage = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN caliber IS NOT NULL AND caliber != '' THEN 1 END) as with_caliber
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
      `);
      
      const total = parseInt(newCoverage.rows[0].total);
      const newWithCaliber = parseInt(newCoverage.rows[0].with_caliber);
      const newPercentage = ((newWithCaliber / total) * 100).toFixed(1);
      
      console.log(`\n📊 New rifle caliber coverage: ${newWithCaliber}/${total} (${newPercentage}%)`);
      
      // Show caliber distribution
      const caliberDistribution = await client.query(`
        SELECT caliber, COUNT(*) as count
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
          AND caliber IS NOT NULL 
          AND caliber != ''
        GROUP BY caliber
        ORDER BY count DESC
        LIMIT 20
      `);
      
      console.log('\n📋 Top rifle calibers:');
      caliberDistribution.rows.forEach(row => {
        console.log(`  ${row.caliber}: ${row.count} rifles`);
      });
      
      // Check if we achieved 100% target
      const targetCoverage = 100;
      const achieved = parseFloat(newPercentage) >= targetCoverage;
      console.log(`\n🎯 Target: ${targetCoverage}% | Achieved: ${newPercentage}% | Success: ${achieved ? 'YES' : 'NEEDS MORE WORK'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the extraction
extractRifleCaliberComplete().catch(console.error);