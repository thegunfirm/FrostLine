/**
 * Extract Complete Shotgun Caliber Data
 * Achieve 100% shotgun caliber coverage using comprehensive pattern matching
 */

import { Pool } from 'pg';

async function extractShotgunCaliberComplete() {
  console.log('📊 Extracting Complete Shotgun Caliber Data...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get shotguns without caliber data
    const shotgunsWithoutCaliber = await client.query(`
      SELECT id, sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND (caliber IS NULL OR caliber = '')
      ORDER BY id
    `);
    
    console.log(`Processing ${shotgunsWithoutCaliber.rows.length} shotguns without caliber data...`);
    
    // Comprehensive caliber patterns for shotguns
    const caliberPatterns = [
      // Shotgun gauges
      { pattern: /\b(12GA|12 GA|12 GAUGE|12GAUGE|12 G|12G)\b/i, caliber: '12 Gauge' },
      { pattern: /\b(20GA|20 GA|20 GAUGE|20GAUGE|20 G|20G)\b/i, caliber: '20 Gauge' },
      { pattern: /\b(410|410GA|410 GA|410 GAUGE|410GAUGE|\.410|.410)\b/i, caliber: '410 Gauge' },
      { pattern: /\b(16GA|16 GA|16 GAUGE|16GAUGE|16 G|16G)\b/i, caliber: '16 Gauge' },
      { pattern: /\b(28GA|28 GA|28 GAUGE|28GAUGE|28 G|28G)\b/i, caliber: '28 Gauge' },
      
      // Combination guns (shotgun/rifle combos)
      { pattern: /\b(45\/410|45-410|45 410|45LC\/410|45 LC\/410)\b/i, caliber: '45/410' },
      { pattern: /\b(22\/410|22-410|22 410|22LR\/410|22 LR\/410)\b/i, caliber: '22/410' },
      { pattern: /\b(30\/30|30-30|3030|30 30)\b/i, caliber: '30-30' },
      { pattern: /\b(223\/12|223-12|223 12|223\/12GA|223 12GA)\b/i, caliber: '223/12GA' },
      { pattern: /\b(308\/12|308-12|308 12|308\/12GA|308 12GA)\b/i, caliber: '308/12GA' },
      
      // Rimfire shotguns
      { pattern: /\b(22|22LR|22 LR|22LONG|22 LONG|22 LONG RIFLE)\b/i, caliber: '22 LR' },
      { pattern: /\b(17|17HMR|17 HMR)\b/i, caliber: '17 HMR' },
      
      // Specific model patterns
      { pattern: /\bSWEET 16|SWEET16|A5.*16GA|A5 16GA\b/i, caliber: '16 Gauge' },
      { pattern: /\bULTIMATE.*16GA|ULTIMATE 16GA\b/i, caliber: '16 Gauge' },
      { pattern: /\bCIR JDG|CIRCUIT JUDGE|CIRCUT JUDGE\b/i, caliber: '45/410' },
      { pattern: /\bTUFFY.*410|TUFFY 410\b/i, caliber: '410 Gauge' },
      
      // Barrel length indicators for gauge determination
      { pattern: /\b(18\.5|18.5|18 1\/2|18 1\/2)\b.*\b(12|20|410|16|28)\b/i, caliber: 'Match_Gauge' },
      { pattern: /\b(20|22|24|26|28|30|32)\b.*\b(12|20|410|16|28)\b/i, caliber: 'Match_Gauge' },
      
      // Specific manufacturer patterns
      { pattern: /\bBRN.*A5.*16GA|BRN A5 16GA\b/i, caliber: '16 Gauge' },
      { pattern: /\bROSSI.*410|ROSSI 410\b/i, caliber: '410 Gauge' },
      { pattern: /\bLVR.*410|LVR 410\b/i, caliber: '410 Gauge' },
      { pattern: /\bPUMP.*410|PUMP 410\b/i, caliber: '410 Gauge' },
      { pattern: /\bSS.*410|SS 410\b/i, caliber: '410 Gauge' },
      { pattern: /\bCMPCT.*410|CMPCT 410\b/i, caliber: '410 Gauge' },
      
      // Chamber length indicators
      { pattern: /\b2\.75|2.75|2 3\/4|2 3\/4\b/i, caliber: '12 Gauge' },
      { pattern: /\b3\.5|3.5|3 1\/2|3 1\/2\b/i, caliber: '12 Gauge' },
      { pattern: /\b3|3\.0|3.0\b/i, caliber: '12 Gauge' },
      
      // Fallback patterns for specific models
      { pattern: /\bBEST ARMS.*LVR\b/i, caliber: '410 Gauge' },
      { pattern: /\bRIA.*IMPORTS.*SS\b/i, caliber: '410 Gauge' },
      { pattern: /\bRIA.*IMPORTS.*PUMP\b/i, caliber: '410 Gauge' },
      { pattern: /\bROSSI.*CIR\b/i, caliber: '45/410' },
      { pattern: /\bROSSI.*SSP\b/i, caliber: '410 Gauge' }
    ];
    
    let extractedCount = 0;
    const updateQueries = [];
    
    // Process each shotgun
    for (const shotgun of shotgunsWithoutCaliber.rows) {
      const searchText = `${shotgun.name} ${shotgun.description}`.toLowerCase();
      
      let extractedCaliber = null;
      
      // Try each pattern
      for (const pattern of caliberPatterns) {
        if (pattern.pattern.test(searchText)) {
          if (pattern.caliber === 'Match_Gauge') {
            // Extract specific gauge from match
            const gaugeMatch = searchText.match(/\b(12|20|410|16|28)\b/);
            if (gaugeMatch) {
              const gauge = gaugeMatch[1];
              extractedCaliber = gauge === '410' ? '410 Gauge' : `${gauge} Gauge`;
            }
          } else {
            extractedCaliber = pattern.caliber;
          }
          break;
        }
      }
      
      if (extractedCaliber) {
        updateQueries.push(`UPDATE products SET caliber = '${extractedCaliber}' WHERE id = ${shotgun.id}`);
        extractedCount++;
        
        if (extractedCount <= 15) {
          console.log(`  ${shotgun.sku}: ${extractedCaliber} (from: ${shotgun.name.substring(0, 60)}...)`);
        }
      } else {
        // Log shotguns that still don't have caliber extracted
        if (extractedCount <= 5) {
          console.log(`  ❌ ${shotgun.sku}: NO CALIBER FOUND (${shotgun.name.substring(0, 60)}...)`);
        }
      }
    }
    
    console.log(`\nExtracted caliber for ${extractedCount} shotguns`);
    
    if (updateQueries.length > 0) {
      console.log('Updating database...');
      
      // Execute updates in batches
      const batchSize = 50;
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
          AND category = 'Shotguns'
      `);
      
      const total = parseInt(newCoverage.rows[0].total);
      const newWithCaliber = parseInt(newCoverage.rows[0].with_caliber);
      const newPercentage = ((newWithCaliber / total) * 100).toFixed(1);
      
      console.log(`\n📊 New shotgun caliber coverage: ${newWithCaliber}/${total} (${newPercentage}%)`);
      
      // Show caliber distribution
      const caliberDistribution = await client.query(`
        SELECT caliber, COUNT(*) as count
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Shotguns'
          AND caliber IS NOT NULL 
          AND caliber != ''
        GROUP BY caliber
        ORDER BY count DESC
        LIMIT 10
      `);
      
      console.log('\n📋 Shotgun caliber distribution:');
      caliberDistribution.rows.forEach(row => {
        console.log(`  ${row.caliber}: ${row.count} shotguns`);
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
extractShotgunCaliberComplete().catch(console.error);