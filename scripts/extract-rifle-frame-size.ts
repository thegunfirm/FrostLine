/**
 * Extract Rifle Frame Size Data
 * Systematically extract frame size data from rifle product names to achieve 80% coverage
 */

import { Pool } from 'pg';

async function extractRifleFrameSize() {
  console.log('📊 Extracting Rifle Frame Size Data...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get rifles without frame size data
    const riflesWithoutFrameSize = await client.query(`
      SELECT id, sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (frame_size IS NULL OR frame_size = '')
      ORDER BY id
      LIMIT 2600
    `);
    
    console.log(`Analyzing ${riflesWithoutFrameSize.rows.length} rifles without frame size data...`);
    
    // Comprehensive frame size patterns for rifles
    const frameSizePatterns = [
      // Rifle platform types
      { pattern: /\b(AR-15|AR15|M4|M16|M16A4|M4A1)\b/i, frameSize: 'AR-15' },
      { pattern: /\b(AR-10|AR10|LR-308|LR308|SR-25|SR25)\b/i, frameSize: 'AR-10' },
      { pattern: /\b(AK-47|AK47|AK-74|AK74|AKM|AK)\b/i, frameSize: 'AK Platform' },
      { pattern: /\b(BOLT ACTION|BOLT-ACTION|BOLT)\b/i, frameSize: 'Bolt Action' },
      { pattern: /\b(LEVER ACTION|LEVER-ACTION|LEVER)\b/i, frameSize: 'Lever Action' },
      { pattern: /\b(SEMI-AUTO|SEMI AUTO|SEMIAUTO)\b/i, frameSize: 'Semi-Auto' },
      { pattern: /\b(PUMP ACTION|PUMP-ACTION|PUMP)\b/i, frameSize: 'Pump Action' },
      { pattern: /\b(SINGLE SHOT|SINGLE-SHOT)\b/i, frameSize: 'Single Shot' },
      
      // Rifle configuration types
      { pattern: /\b(CARBINE|CARBINE LENGTH|CARBINE RIFLE)\b/i, frameSize: 'Carbine' },
      { pattern: /\b(TACTICAL|TACTICAL RIFLE|TAC)\b/i, frameSize: 'Tactical' },
      { pattern: /\b(HUNTING|HUNTING RIFLE|HUNTER)\b/i, frameSize: 'Hunting' },
      { pattern: /\b(PRECISION|PRECISION RIFLE|SNIPER)\b/i, frameSize: 'Precision' },
      { pattern: /\b(SCOUT|SCOUT RIFLE|SCOUT SCOPE)\b/i, frameSize: 'Scout' },
      { pattern: /\b(COMPACT|COMPACT RIFLE|COMPCT)\b/i, frameSize: 'Compact' },
      { pattern: /\b(STANDARD|STANDARD RIFLE|STD)\b/i, frameSize: 'Standard' },
      { pattern: /\b(MATCH|MATCH RIFLE|COMPETITION)\b/i, frameSize: 'Match' },
      { pattern: /\b(VARMINT|VARMINT RIFLE|VARMINTER)\b/i, frameSize: 'Varmint' },
      { pattern: /\b(BENCH|BENCH REST|BENCHREST)\b/i, frameSize: 'Bench Rest' },
      { pattern: /\b(YOUTH|YOUTH RIFLE|YOUTH MODEL)\b/i, frameSize: 'Youth' },
      
      // Specific rifle models and types
      { pattern: /\b(1911|1911A1|1911-A1)\b/i, frameSize: '1911' },
      { pattern: /\b(AR-308|AR308|DPMS|LR-308)\b/i, frameSize: 'AR-308' },
      { pattern: /\b(M1 GARAND|M1GARAND|GARAND)\b/i, frameSize: 'M1 Garand' },
      { pattern: /\b(M1 CARBINE|M1CARBINE|M1 CARB)\b/i, frameSize: 'M1 Carbine' },
      { pattern: /\b(M14|M1A|M14 RIFLE)\b/i, frameSize: 'M14' },
      { pattern: /\b(MINI-14|MINI14|RANCH RIFLE)\b/i, frameSize: 'Mini-14' },
      { pattern: /\b(10\/22|1022|RUGER 10\/22)\b/i, frameSize: '10/22' },
      { pattern: /\b(SAVAGE|SAVAGE RIFLE|SAVAGE MODEL)\b/i, frameSize: 'Savage' },
      { pattern: /\b(REMINGTON|REM|REMINGTON 700|REM 700)\b/i, frameSize: 'Remington' },
      { pattern: /\b(WINCHESTER|WIN|WINCHESTER MODEL)\b/i, frameSize: 'Winchester' },
      { pattern: /\b(MOSSBERG|MOSS|MOSSBERG MODEL)\b/i, frameSize: 'Mossberg' },
      { pattern: /\b(MARLIN|MARLIN MODEL)\b/i, frameSize: 'Marlin' },
      { pattern: /\b(HENRY|HENRY RIFLE|HENRY MODEL)\b/i, frameSize: 'Henry' },
      { pattern: /\b(TIKKA|TIKKA T3|TIKKA T3X)\b/i, frameSize: 'Tikka' },
      { pattern: /\b(BERGARA|BERGARA RIFLE)\b/i, frameSize: 'Bergara' },
      { pattern: /\b(CHRISTENSEN|CHRISTENSEN ARMS)\b/i, frameSize: 'Christensen' },
      
      // Barrel length based sizing
      { pattern: /\b(16\"|16 INCH|16IN|16-INCH)\b/i, frameSize: 'Carbine' },
      { pattern: /\b(18\"|18 INCH|18IN|18-INCH)\b/i, frameSize: 'Standard' },
      { pattern: /\b(20\"|20 INCH|20IN|20-INCH)\b/i, frameSize: 'Standard' },
      { pattern: /\b(22\"|22 INCH|22IN|22-INCH)\b/i, frameSize: 'Hunting' },
      { pattern: /\b(24\"|24 INCH|24IN|24-INCH)\b/i, frameSize: 'Hunting' },
      { pattern: /\b(26\"|26 INCH|26IN|26-INCH)\b/i, frameSize: 'Long Range' },
      { pattern: /\b(28\"|28 INCH|28IN|28-INCH)\b/i, frameSize: 'Long Range' },
      
      // Special configurations
      { pattern: /\b(BULL BARREL|BULL-BARREL|BULLBARREL)\b/i, frameSize: 'Bull Barrel' },
      { pattern: /\b(HEAVY BARREL|HEAVY-BARREL|HBAR)\b/i, frameSize: 'Heavy Barrel' },
      { pattern: /\b(FLUTED|FLUTED BARREL|FLUTED-BARREL)\b/i, frameSize: 'Fluted' },
      { pattern: /\b(THUMBHOLE|THUMB-HOLE|THUMBHOLE STOCK)\b/i, frameSize: 'Thumbhole' },
      { pattern: /\b(BULLPUP|BULL-PUP|BULLPUP RIFLE)\b/i, frameSize: 'Bullpup' },
      { pattern: /\b(TAKEDOWN|TAKE-DOWN|TAKEDOWN RIFLE)\b/i, frameSize: 'Takedown' },
      { pattern: /\b(FOLDING|FOLDING STOCK|FOLDER)\b/i, frameSize: 'Folding' },
      { pattern: /\b(COLLAPSIBLE|COLLAPSIBLE STOCK|COLLAP)\b/i, frameSize: 'Collapsible' },
      { pattern: /\b(FIXED|FIXED STOCK|FIXED-STOCK)\b/i, frameSize: 'Fixed Stock' },
      { pattern: /\b(ADJUSTABLE|ADJUSTABLE STOCK|ADJ)\b/i, frameSize: 'Adjustable' },
      
      // Manufacturer specific frame types
      { pattern: /\b(DPMS|DPMS RIFLE|DPMS MODEL)\b/i, frameSize: 'DPMS' },
      { pattern: /\b(COLT|COLT RIFLE|COLT MODEL)\b/i, frameSize: 'Colt' },
      { pattern: /\b(SMITH & WESSON|S&W|SW)\b/i, frameSize: 'Smith & Wesson' },
      { pattern: /\b(SIG|SIG SAUER|SIG MODEL)\b/i, frameSize: 'SIG' },
      { pattern: /\b(SPRINGFIELD|SPGFLD|SPRINGFIELD MODEL)\b/i, frameSize: 'Springfield' },
      { pattern: /\b(RUGER|RUGER MODEL|RUGER RIFLE)\b/i, frameSize: 'Ruger' },
      { pattern: /\b(DANIEL DEFENSE|DD|DANIEL DEF)\b/i, frameSize: 'Daniel Defense' },
      { pattern: /\b(BCM|BRAVO COMPANY|BRAVO CO)\b/i, frameSize: 'BCM' },
      { pattern: /\b(AERO|AERO PRECISION|AERO PREC)\b/i, frameSize: 'Aero Precision' },
      { pattern: /\b(PALMETTO|PSA|PALMETTO STATE)\b/i, frameSize: 'Palmetto' },
      { pattern: /\b(ANDERSON|ANDERSON MFG|ANDERSON MANUF)\b/i, frameSize: 'Anderson' },
      
      // Generic rifle types
      { pattern: /\b(RIFLE|RIFLE MODEL|RFL)\b/i, frameSize: 'Rifle' },
      { pattern: /\b(LONG GUN|LONGGUN|LONG-GUN)\b/i, frameSize: 'Long Gun' },
      { pattern: /\b(CENTERFIRE|CENTER-FIRE|CENTERFIRE RIFLE)\b/i, frameSize: 'Centerfire' },
      { pattern: /\b(RIMFIRE|RIM-FIRE|RIMFIRE RIFLE)\b/i, frameSize: 'Rimfire' }
    ];
    
    let extractedCount = 0;
    const updateQueries = [];
    
    // Process each rifle
    for (const rifle of riflesWithoutFrameSize.rows) {
      const searchText = `${rifle.name} ${rifle.description}`.toLowerCase();
      
      let extractedFrameSize = null;
      
      // Try each pattern (most specific first)
      for (const pattern of frameSizePatterns) {
        if (pattern.pattern.test(searchText)) {
          extractedFrameSize = pattern.frameSize;
          break;
        }
      }
      
      if (extractedFrameSize) {
        updateQueries.push(`UPDATE products SET frame_size = '${extractedFrameSize}' WHERE id = ${rifle.id}`);
        extractedCount++;
        
        if (extractedCount <= 15) {
          console.log(`  ${rifle.sku}: ${extractedFrameSize} (from: ${rifle.name.substring(0, 60)}...)`);
        }
      }
    }
    
    console.log(`\nExtracted frame size for ${extractedCount} rifles`);
    
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
          COUNT(CASE WHEN frame_size IS NOT NULL AND frame_size != '' THEN 1 END) as with_frame_size
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
      `);
      
      const total = parseInt(newCoverage.rows[0].total);
      const newWithFrameSize = parseInt(newCoverage.rows[0].with_frame_size);
      const newPercentage = ((newWithFrameSize / total) * 100).toFixed(1);
      
      console.log(`\n📊 New rifle frame size coverage: ${newWithFrameSize}/${total} (${newPercentage}%)`);
      
      // Show frame size distribution
      const frameSizeDistribution = await client.query(`
        SELECT frame_size, COUNT(*) as count
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
          AND frame_size IS NOT NULL 
          AND frame_size != ''
        GROUP BY frame_size
        ORDER BY count DESC
        LIMIT 15
      `);
      
      console.log('\n📋 Top rifle frame sizes:');
      frameSizeDistribution.rows.forEach(row => {
        console.log(`  ${row.frame_size}: ${row.count} rifles`);
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
extractRifleFrameSize().catch(console.error);