/**
 * Analyze Shotgun Caliber Coverage
 * Check shotgun caliber coverage - should be 100% like rifles
 */

import { Pool } from 'pg';

async function analyzeShotgunCaliberCoverage() {
  console.log('📊 Analyzing Shotgun Caliber Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current caliber coverage for shotguns
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN caliber IS NOT NULL AND caliber != '' THEN 1 END) as with_caliber
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
    `);
    
    const total = parseInt(coverage.rows[0].total);
    const withCaliber = parseInt(coverage.rows[0].with_caliber);
    const percentage = ((withCaliber / total) * 100).toFixed(1);
    
    console.log(`Current shotgun caliber coverage: ${withCaliber}/${total} (${percentage}%)`);
    
    // Show shotguns WITHOUT caliber data
    const missingCaliber = await client.query(`
      SELECT sku, name, description
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND (caliber IS NULL OR caliber = '')
      ORDER BY id
      LIMIT 15
    `);
    
    console.log('\n📋 Sample shotguns missing caliber data:');
    missingCaliber.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name.substring(0, 70)}...`);
    });
    
    // Show current caliber distribution
    const distribution = await client.query(`
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
    
    console.log('\n📋 Current shotgun caliber distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} shotguns`);
    });
    
    // Check if we need to improve shotgun caliber coverage
    const targetCoverage = 100;
    const needsImprovement = parseFloat(percentage) < targetCoverage;
    
    console.log(`\n🎯 Target coverage: ${targetCoverage}%`);
    console.log(`Current coverage: ${percentage}%`);
    console.log(`Needs improvement: ${needsImprovement ? 'YES' : 'NO'}`);
    
    if (needsImprovement) {
      const needed = Math.ceil(total * (targetCoverage / 100)) - withCaliber;
      console.log(`Need to extract caliber for ${needed} more shotguns`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeShotgunCaliberCoverage().catch(console.error);