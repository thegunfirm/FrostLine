/**
 * Extract Rifle Finish Data
 * Systematically extract finish data from rifle product names to achieve 80% coverage
 */

import { Pool } from 'pg';

async function extractRifleFinish() {
  console.log('📊 Extracting Rifle Finish Data...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get rifles without finish data
    const riflesWithoutFinish = await client.query(`
      SELECT id, sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (finish IS NULL OR finish = '')
      ORDER BY id
      LIMIT 1500
    `);
    
    console.log(`Analyzing ${riflesWithoutFinish.rows.length} rifles without finish data...`);
    
    // Comprehensive finish patterns for rifles
    const finishPatterns = [
      // Basic colors and finishes
      { pattern: /\b(BLACK|BLK|BLCK)\b/i, finish: 'Black' },
      { pattern: /\b(STAINLESS|SS|STAINLESS STEEL|STNLS)\b/i, finish: 'Stainless Steel' },
      { pattern: /\b(FDE|FLAT DARK EARTH|FLATDARK)\b/i, finish: 'FDE' },
      { pattern: /\b(OD GREEN|ODG|OLIVE DRAB|OD|OLIVE GREEN)\b/i, finish: 'OD Green' },
      { pattern: /\b(GRAY|GREY|GRY)\b/i, finish: 'Gray' },
      { pattern: /\b(TAN|TAUPE|DESERT TAN)\b/i, finish: 'Tan' },
      { pattern: /\b(BRONZE|BRZ|BURNT BRONZE)\b/i, finish: 'Bronze' },
      { pattern: /\b(BROWN|BRN|DARK BROWN)\b/i, finish: 'Brown' },
      { pattern: /\b(WHITE|WHT|ARCTIC WHITE)\b/i, finish: 'White' },
      { pattern: /\b(BLUE|BLU|NAVY|ROYAL BLUE)\b/i, finish: 'Blue' },
      { pattern: /\b(GREEN|GRN|FOREST GREEN)\b/i, finish: 'Green' },
      { pattern: /\b(RED|CRIMSON|CHERRY RED)\b/i, finish: 'Red' },
      { pattern: /\b(SILVER|SLV|BRIGHT SILVER)\b/i, finish: 'Silver' },
      { pattern: /\b(GOLD|GLD|GOLDEN)\b/i, finish: 'Gold' },
      { pattern: /\b(NICKEL|NIK|NICKLE)\b/i, finish: 'Nickel' },
      { pattern: /\b(CHROME|CHR|CHROMED)\b/i, finish: 'Chrome' },
      
      // Specialized finishes
      { pattern: /\b(CERAKOTE|CERAKOTED|CERAKOTE FINISH)\b/i, finish: 'Cerakote' },
      { pattern: /\b(ANODIZED|ANODIZE|HARD ANODIZED)\b/i, finish: 'Anodized' },
      { pattern: /\b(PARKERIZED|PARKERIZE|PARK)\b/i, finish: 'Parkerized' },
      { pattern: /\b(PHOSPHATE|PHOS|PHOSPHATED)\b/i, finish: 'Phosphate' },
      { pattern: /\b(NITRIDE|NITRIDE FINISH|MELONITE)\b/i, finish: 'Nitride' },
      { pattern: /\b(BLUED|BLUE FINISH|BLUING)\b/i, finish: 'Blued' },
      { pattern: /\b(MATTE|MATTE FINISH|MATTE BLACK)\b/i, finish: 'Matte' },
      { pattern: /\b(GLOSS|GLOSS FINISH|GLOSSY)\b/i, finish: 'Gloss' },
      { pattern: /\b(SATIN|SATIN FINISH)\b/i, finish: 'Satin' },
      
      // Camouflage patterns
      { pattern: /\b(CAMO|CAMOUFLAGE|CAMOUFLAGED)\b/i, finish: 'Camouflage' },
      { pattern: /\b(MULTICAM|MULTI-CAM|MULTICAMO)\b/i, finish: 'Multicam' },
      { pattern: /\b(WOODLAND|WOODLAND CAMO)\b/i, finish: 'Woodland Camo' },
      { pattern: /\b(DIGITAL|DIGITAL CAMO|DIGI CAM)\b/i, finish: 'Digital Camo' },
      { pattern: /\b(TIGER STRIPE|TIGERSTRIPE)\b/i, finish: 'Tiger Stripe' },
      { pattern: /\b(MUDDY GIRL|MUDDY|PINK CAMO)\b/i, finish: 'Muddy Girl' },
      { pattern: /\b(REALTREE|REAL TREE|MOSSY OAK)\b/i, finish: 'Camouflage' },
      { pattern: /\b(KRYPTEK|CRYPETEK)\b/i, finish: 'Kryptek' },
      
      // Wood finishes
      { pattern: /\b(WOOD|WOODEN|WALNUT|CHERRY|MAPLE|OAK)\b/i, finish: 'Wood' },
      { pattern: /\b(LAMINATE|LAMINATED|LAMINAT)\b/i, finish: 'Laminate' },
      
      // Two-tone patterns
      { pattern: /\b(TWO-TONE|TWO TONE|2-TONE|2 TONE)\b/i, finish: 'Two-Tone' },
      { pattern: /\b(BLACK\/GRAY|BLACK\/GREY|BLK\/GRY)\b/i, finish: 'Black/Gray' },
      { pattern: /\b(BLACK\/TAN|BLK\/TAN|BLACK\/FDE)\b/i, finish: 'Black/Tan' },
      { pattern: /\b(STAINLESS\/BLACK|SS\/BLK)\b/i, finish: 'Stainless/Black' },
      
      // Manufacturer specific patterns
      { pattern: /\b(MAGPUL|MAGPUL FDE|MAGPUL BLACK)\b/i, finish: 'Magpul' },
      { pattern: /\b(BURNT BRONZE|BURNT BRZ)\b/i, finish: 'Burnt Bronze' },
      { pattern: /\b(TUNGSTEN|TUNGSTEN GRAY)\b/i, finish: 'Tungsten' },
      { pattern: /\b(TITANIUM|TITANIUM FINISH|TI)\b/i, finish: 'Titanium' },
      { pattern: /\b(COPPER|COPPER FINISH|COP)\b/i, finish: 'Copper' },
      
      // Specialty finishes
      { pattern: /\b(DISTRESSED|DISTRESSED FINISH)\b/i, finish: 'Distressed' },
      { pattern: /\b(WEATHERED|WEATHERED FINISH)\b/i, finish: 'Weathered' },
      { pattern: /\b(VINTAGE|VINTAGE FINISH)\b/i, finish: 'Vintage' },
      { pattern: /\b(BATTLE WORN|BATTLEWORN)\b/i, finish: 'Battle Worn' }
    ];
    
    let extractedCount = 0;
    const updateQueries = [];
    
    // Process each rifle
    for (const rifle of riflesWithoutFinish.rows) {
      const searchText = `${rifle.name} ${rifle.description}`.toLowerCase();
      
      let extractedFinish = null;
      
      // Try each pattern (most specific first)
      for (const pattern of finishPatterns) {
        if (pattern.pattern.test(searchText)) {
          extractedFinish = pattern.finish;
          break;
        }
      }
      
      if (extractedFinish) {
        updateQueries.push(`UPDATE products SET finish = '${extractedFinish}' WHERE id = ${rifle.id}`);
        extractedCount++;
        
        if (extractedCount <= 15) {
          console.log(`  ${rifle.sku}: ${extractedFinish} (from: ${rifle.name.substring(0, 60)}...)`);
        }
      }
    }
    
    console.log(`\nExtracted finish for ${extractedCount} rifles`);
    
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
          COUNT(CASE WHEN finish IS NOT NULL AND finish != '' THEN 1 END) as with_finish
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
      `);
      
      const total = parseInt(newCoverage.rows[0].total);
      const newWithFinish = parseInt(newCoverage.rows[0].with_finish);
      const newPercentage = ((newWithFinish / total) * 100).toFixed(1);
      
      console.log(`\n📊 New rifle finish coverage: ${newWithFinish}/${total} (${newPercentage}%)`);
      
      // Show finish distribution
      const finishDistribution = await client.query(`
        SELECT finish, COUNT(*) as count
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
          AND finish IS NOT NULL 
          AND finish != ''
        GROUP BY finish
        ORDER BY count DESC
        LIMIT 15
      `);
      
      console.log('\n📋 Top rifle finishes:');
      finishDistribution.rows.forEach(row => {
        console.log(`  ${row.finish}: ${row.count} rifles`);
      });
      
      // Check if we achieved 80% target
      const targetCoverage = 80;
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
extractRifleFinish().catch(console.error);