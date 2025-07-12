/**
 * Analyze Rifle Finish Coverage
 * Check current finish coverage for rifles
 */

import { Pool } from 'pg';

async function analyzeRifleFinish() {
  console.log('📊 Analyzing Rifle Finish Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current finish coverage
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN finish IS NOT NULL AND finish != '' THEN 1 END) as with_finish
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const total = parseInt(coverage.rows[0].total);
    const withFinish = parseInt(coverage.rows[0].with_finish);
    const percentage = ((withFinish / total) * 100).toFixed(1);
    
    console.log(`Current rifle finish coverage: ${withFinish}/${total} (${percentage}%)`);
    
    // Show current finish distribution
    const distribution = await client.query(`
      SELECT finish, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND finish IS NOT NULL 
        AND finish != ''
      GROUP BY finish
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Current rifle finish distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.finish}: ${row.count} rifles`);
    });
    
    // Determine if we need to improve finish coverage
    const targetCoverage = 80;
    const needsImprovement = parseFloat(percentage) < targetCoverage;
    
    console.log(`\n🎯 Target coverage: ${targetCoverage}%`);
    console.log(`Current coverage: ${percentage}%`);
    console.log(`Needs improvement: ${needsImprovement ? 'YES' : 'NO'}`);
    
    if (needsImprovement) {
      const needed = Math.ceil(total * (targetCoverage / 100)) - withFinish;
      console.log(`Need to extract finish for ${needed} more rifles`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeRifleFinish().catch(console.error);