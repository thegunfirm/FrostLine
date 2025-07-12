/**
 * Analyze Rifle Barrel Length Coverage
 * Check current barrel length coverage for rifles
 */

import { Pool } from 'pg';

async function analyzeRifleBarrelLength() {
  console.log('📊 Analyzing Rifle Barrel Length Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get current barrel length coverage
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN barrel_length IS NOT NULL AND barrel_length != '' THEN 1 END) as with_barrel_length
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const total = parseInt(coverage.rows[0].total);
    const withBarrelLength = parseInt(coverage.rows[0].with_barrel_length);
    const percentage = ((withBarrelLength / total) * 100).toFixed(1);
    
    console.log(`Current rifle barrel length coverage: ${withBarrelLength}/${total} (${percentage}%)`);
    
    // Show current barrel length distribution
    const distribution = await client.query(`
      SELECT barrel_length, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND barrel_length IS NOT NULL 
        AND barrel_length != ''
      GROUP BY barrel_length
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Current rifle barrel length distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.barrel_length}: ${row.count} rifles`);
    });
    
    // Sample rifles without barrel length
    const sampleWithout = await client.query(`
      SELECT sku, name
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (barrel_length IS NULL OR barrel_length = '')
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('\n📋 Sample rifles without barrel length:');
    sampleWithout.rows.forEach(row => {
      console.log(`  ${row.sku}: ${row.name.substring(0, 60)}...`);
    });
    
    // Determine if we need to improve barrel length coverage
    const targetCoverage = 80;
    const needsImprovement = parseFloat(percentage) < targetCoverage;
    
    console.log(`\n🎯 Target coverage: ${targetCoverage}%`);
    console.log(`Current coverage: ${percentage}%`);
    console.log(`Needs improvement: ${needsImprovement ? 'YES' : 'NO'}`);
    
    if (needsImprovement) {
      const needed = Math.ceil(total * (targetCoverage / 100)) - withBarrelLength;
      console.log(`Need to extract barrel length for ${needed} more rifles`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeRifleBarrelLength().catch(console.error);