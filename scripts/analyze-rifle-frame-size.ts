/**
 * Analyze Rifle Frame Size Coverage
 * Check current frame size coverage for rifles
 */

import { Pool } from 'pg';

async function analyzeRifleFrameSize() {
  console.log('📊 Analyzing Rifle Frame Size Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current frame size coverage
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN frame_size IS NOT NULL AND frame_size != '' THEN 1 END) as with_frame_size
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const total = parseInt(coverage.rows[0].total);
    const withFrameSize = parseInt(coverage.rows[0].with_frame_size);
    const percentage = ((withFrameSize / total) * 100).toFixed(1);
    
    console.log(`Current rifle frame size coverage: ${withFrameSize}/${total} (${percentage}%)`);
    
    // Show current frame size distribution
    const distribution = await client.query(`
      SELECT frame_size, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND frame_size IS NOT NULL 
        AND frame_size != ''
      GROUP BY frame_size
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Current rifle frame size distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.frame_size}: ${row.count} rifles`);
    });
    
    // Determine if we need to improve frame size coverage
    const targetCoverage = 80;
    const needsImprovement = parseFloat(percentage) < targetCoverage;
    
    console.log(`\n🎯 Target coverage: ${targetCoverage}%`);
    console.log(`Current coverage: ${percentage}%`);
    console.log(`Needs improvement: ${needsImprovement ? 'YES' : 'NO'}`);
    
    if (needsImprovement) {
      const needed = Math.ceil(total * (targetCoverage / 100)) - withFrameSize;
      console.log(`Need to extract frame size for ${needed} more rifles`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeRifleFrameSize().catch(console.error);