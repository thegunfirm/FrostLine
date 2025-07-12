/**
 * Extract Rifle Calibers - First Filter Extension
 * Systematically extract caliber data from rifle product names
 */

import { Pool } from 'pg';

async function extractRifleCalibers() {
  console.log('📊 Extracting Rifle Calibers...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current rifle caliber coverage
    const currentCoverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN caliber IS NOT NULL AND caliber != '' THEN 1 END) as with_caliber
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const total = parseInt(currentCoverage.rows[0].total);
    const withCaliber = parseInt(currentCoverage.rows[0].with_caliber);
    const currentPercentage = ((withCaliber / total) * 100).toFixed(1);
    
    console.log(`Current rifle caliber coverage: ${withCaliber}/${total} (${currentPercentage}%)`);
    
    // Get rifles without caliber data
    const riflesWithoutCaliber = await client.query(`
      SELECT id, sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (caliber IS NULL OR caliber = '')
      ORDER BY id
      LIMIT 500
    `);
    
    console.log(`\nAnalyzing ${riflesWithoutCaliber.rows.length} rifles without caliber data...`);
    
    // Enhanced caliber patterns for rifles
    const caliberPatterns = [
      // Common rifle calibers
      { pattern: /\b(223|\.223|223 REM|223REM)\b/i, caliber: '223 Remington' },
      { pattern: /\b(5\.56|556|5\.56 NATO|556NATO)\b/i, caliber: '5.56 NATO' },
      { pattern: /\b(308|\.308|308 WIN|308WIN)\b/i, caliber: '308 Winchester' },
      { pattern: /\b(30-06|30\.06|3006)\b/i, caliber: '30-06 Springfield' },
      { pattern: /\b(270|\.270|270 WIN|270WIN)\b/i, caliber: '270 Winchester' },
      { pattern: /\b(7MM-08|7MM08)\b/i, caliber: '7mm-08 Remington' },
      { pattern: /\b(300 WIN|300WIN|300 WM)\b/i, caliber: '300 Winchester Magnum' },
      { pattern: /\b(30-30|3030)\b/i, caliber: '30-30 Winchester' },
      { pattern: /\b(22 LR|22LR|\.22 LR|\.22LR)\b/i, caliber: '22 LR' },
      { pattern: /\b(22 WMR|22WMR|\.22 WMR|\.22WMR)\b/i, caliber: '22 WMR' },
      { pattern: /\b(17 HMR|17HMR|\.17 HMR|\.17HMR)\b/i, caliber: '17 HMR' },
      { pattern: /\b(6\.5 CREEDMOOR|6\.5CREEDMOOR|65CREEDMOOR)\b/i, caliber: '6.5 Creedmoor' },
      { pattern: /\b(6\.5 GRENDEL|6\.5GRENDEL|65GRENDEL)\b/i, caliber: '6.5 Grendel' },
      { pattern: /\b(300 BLK|300BLK|300 BLACKOUT)\b/i, caliber: '300 Blackout' },
      { pattern: /\b(450 BUSHMASTER|450BUSHMASTER)\b/i, caliber: '450 Bushmaster' },
      { pattern: /\b(458 SOCOM|458SOCOM)\b/i, caliber: '458 SOCOM' },
      { pattern: /\b(50 BEOWULF|50BEOWULF)\b/i, caliber: '50 Beowulf' },
      { pattern: /\b(7\.62X39|762X39|7\.62 X39)\b/i, caliber: '7.62x39' },
      { pattern: /\b(7\.62X51|762X51|7\.62 X51)\b/i, caliber: '7.62x51' },
      { pattern: /\b(300 AAC|300AAC)\b/i, caliber: '300 AAC Blackout' },
      { pattern: /\b(6\.8 SPC|6\.8SPC|68SPC)\b/i, caliber: '6.8 SPC' },
      { pattern: /\b(350 LEGEND|350LEGEND)\b/i, caliber: '350 Legend' },
      { pattern: /\b(243|\.243|243 WIN|243WIN)\b/i, caliber: '243 Winchester' },
      { pattern: /\b(25-06|2506|25\.06)\b/i, caliber: '25-06 Remington' },
      { pattern: /\b(280|\.280|280 REM|280REM)\b/i, caliber: '280 Remington' },
      { pattern: /\b(7MM REM|7MMREM|7MM MAG)\b/i, caliber: '7mm Remington Magnum' },
      { pattern: /\b(300 RUM|300RUM)\b/i, caliber: '300 Remington Ultra Magnum' },
      { pattern: /\b(338 WIN|338WIN|338 WM)\b/i, caliber: '338 Winchester Magnum' },
      { pattern: /\b(375 H&H|375H&H|375HH)\b/i, caliber: '375 H&H Magnum' },
      { pattern: /\b(416 REM|416REM)\b/i, caliber: '416 Remington Magnum' },
      { pattern: /\b(458 WIN|458WIN)\b/i, caliber: '458 Winchester Magnum' },
      { pattern: /\b(50 BMG|50BMG|\.50 BMG|\.50BMG)\b/i, caliber: '50 BMG' }
    ];
    
    let extractedCount = 0;
    const updateQueries = [];
    
    // Process each rifle
    for (const rifle of riflesWithoutCaliber.rows) {
      const searchText = `${rifle.name} ${rifle.description}`.toLowerCase();
      
      let extractedCaliber = null;
      
      // Try each pattern
      for (const pattern of caliberPatterns) {
        if (pattern.pattern.test(searchText)) {
          extractedCaliber = pattern.caliber;
          break;
        }
      }
      
      if (extractedCaliber) {
        updateQueries.push(`UPDATE products SET caliber = '${extractedCaliber}' WHERE id = ${rifle.id}`);
        extractedCount++;
        
        if (extractedCount <= 10) {
          console.log(`  ${rifle.sku}: ${extractedCaliber} (from: ${rifle.name.substring(0, 60)}...)`);
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
      
      const newWithCaliber = parseInt(newCoverage.rows[0].with_caliber);
      const newPercentage = ((newWithCaliber / total) * 100).toFixed(1);
      
      console.log(`\n📊 New rifle caliber coverage: ${newWithCaliber}/${total} (${newPercentage}%)`);
      console.log(`Improvement: +${newWithCaliber - withCaliber} calibers (${(newPercentage - parseFloat(currentPercentage)).toFixed(1)}%)`);
      
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
        LIMIT 10
      `);
      
      console.log('\n📋 Top rifle calibers:');
      caliberDistribution.rows.forEach(row => {
        console.log(`  ${row.caliber}: ${row.count} rifles`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the extraction
extractRifleCalibers().catch(console.error);