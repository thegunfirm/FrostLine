/**
 * Analyze Rifle Caliber Coverage
 * Check why rifle caliber coverage is only 47.7% when it should be 100%
 */

import { Pool } from 'pg';

async function analyzeRifleCaliberCoverage() {
  console.log('📊 Analyzing Rifle Caliber Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current caliber coverage
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN caliber IS NOT NULL AND caliber != '' THEN 1 END) as with_caliber
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const total = parseInt(coverage.rows[0].total);
    const withCaliber = parseInt(coverage.rows[0].with_caliber);
    const percentage = ((withCaliber / total) * 100).toFixed(1);
    
    console.log(`Current rifle caliber coverage: ${withCaliber}/${total} (${percentage}%)`);
    
    // Show rifles WITHOUT caliber data
    const missingCaliber = await client.query(`
      SELECT sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (caliber IS NULL OR caliber = '')
      ORDER BY id
      LIMIT 15
    `);
    
    console.log('\n📋 Sample rifles missing caliber data:');
    missingCaliber.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name.substring(0, 70)}...`);
    });
    
    // Show current caliber distribution
    const distribution = await client.query(`
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
    
    console.log('\n📋 Current rifle caliber distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} rifles`);
    });
    
    // Check for caliber patterns in names of rifles without caliber
    const patternCheck = await client.query(`
      SELECT sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (caliber IS NULL OR caliber = '')
        AND (
          name ~* '(223|5\\.56|308|7\\.62|30-06|270|243|22|6\\.5|7MM|300|350|400|450|458|45|9MM|40|357|38|44|50|12GA|20GA|410|16GA|28GA)'
          OR description ~* '(223|5\\.56|308|7\\.62|30-06|270|243|22|6\\.5|7MM|300|350|400|450|458|45|9MM|40|357|38|44|50|12GA|20GA|410|16GA|28GA)'
        )
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('\n📋 Rifles with clear caliber patterns but missing caliber field:');
    patternCheck.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name.substring(0, 70)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeRifleCaliberCoverage().catch(console.error);