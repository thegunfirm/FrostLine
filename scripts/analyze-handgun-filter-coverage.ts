/**
 * Analyze Handgun Filter Coverage
 * Understanding current handgun filtering to replicate for rifles/shotguns
 */

import { Pool } from 'pg';

async function analyzeHandgunFilterCoverage() {
  console.log('📊 Analyzing Handgun Filter Coverage...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get total handgun count
    const totalHandguns = await client.query(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
    `);
    
    const total = parseInt(totalHandguns.rows[0].total);
    console.log(`\n📊 Total Handguns: ${total}`);
    
    // Analyze each filter coverage
    const filters = [
      { name: 'caliber', field: 'caliber' },
      { name: 'capacity', field: 'capacity' },
      { name: 'barrel_length', field: 'barrel_length' },
      { name: 'finish', field: 'finish' },
      { name: 'frame_size', field: 'frame_size' },
      { name: 'action_type', field: 'action_type' },
      { name: 'sight_type', field: 'sight_type' }
    ];
    
    console.log('\n📋 Handgun Filter Coverage Analysis:');
    
    for (const filter of filters) {
      const coverage = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${filter.field} IS NOT NULL AND ${filter.field} != '' THEN 1 END) as with_data,
          COUNT(CASE WHEN ${filter.field} IS NULL OR ${filter.field} = '' THEN 1 END) as without_data
        FROM products 
        WHERE department_number = '01' 
          AND category = 'Handguns'
      `);
      
      const withData = parseInt(coverage.rows[0].with_data);
      const withoutData = parseInt(coverage.rows[0].without_data);
      const percentage = ((withData / total) * 100).toFixed(1);
      
      console.log(`  ${filter.name}: ${withData}/${total} (${percentage}%) - Missing: ${withoutData}`);
      
      // Show top values for populated fields
      if (withData > 0) {
        const topValues = await client.query(`
          SELECT ${filter.field}, COUNT(*) as count
          FROM products 
          WHERE department_number = '01' 
            AND category = 'Handguns'
            AND ${filter.field} IS NOT NULL 
            AND ${filter.field} != ''
          GROUP BY ${filter.field}
          ORDER BY count DESC
          LIMIT 5
        `);
        
        console.log(`    Top values: ${topValues.rows.map(r => `${r[filter.field]} (${r.count})`).join(', ')}`);
      }
    }
    
    // Now check rifles and shotguns current state
    console.log('\n📊 Current Rifle Filter Coverage:');
    
    const totalRifles = await client.query(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const rifleTotal = parseInt(totalRifles.rows[0].total);
    console.log(`Total Rifles: ${rifleTotal}`);
    
    for (const filter of filters) {
      const coverage = await client.query(`
        SELECT 
          COUNT(CASE WHEN ${filter.field} IS NOT NULL AND ${filter.field} != '' THEN 1 END) as with_data
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Rifles'
      `);
      
      const withData = parseInt(coverage.rows[0].with_data);
      const percentage = ((withData / rifleTotal) * 100).toFixed(1);
      
      console.log(`  ${filter.name}: ${withData}/${rifleTotal} (${percentage}%)`);
    }
    
    console.log('\n📊 Current Shotgun Filter Coverage:');
    
    const totalShotguns = await client.query(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
    `);
    
    const shotgunTotal = parseInt(totalShotguns.rows[0].total);
    console.log(`Total Shotguns: ${shotgunTotal}`);
    
    for (const filter of filters) {
      const coverage = await client.query(`
        SELECT 
          COUNT(CASE WHEN ${filter.field} IS NOT NULL AND ${filter.field} != '' THEN 1 END) as with_data
        FROM products 
        WHERE department_number = '05' 
          AND category = 'Shotguns'
      `);
      
      const withData = parseInt(coverage.rows[0].with_data);
      const percentage = ((withData / shotgunTotal) * 100).toFixed(1);
      
      console.log(`  ${filter.name}: ${withData}/${shotgunTotal} (${percentage}%)`);
    }
    
    // Identify next filter to work on
    console.log('\n🎯 NEXT STEPS:');
    console.log('Need to achieve 80% coverage for each filter on rifles and shotguns');
    console.log('Starting with caliber extraction for rifles (currently low coverage)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the analysis
analyzeHandgunFilterCoverage().catch(console.error);