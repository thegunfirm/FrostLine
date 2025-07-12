/**
 * Analyze Rifle and Shotgun Caliber Distribution
 * Identify which calibers belong in which category
 */

import { Pool } from 'pg';

async function analyzeRifleShotgunCalibers() {
  console.log('🔍 Analyzing rifle and shotgun caliber distribution...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all rifles with calibers
    const rifles = await client.query(`
      SELECT caliber, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND caliber IS NOT NULL 
        AND caliber != ''
      GROUP BY caliber
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Current rifle calibers:');
    rifles.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} rifles`);
    });
    
    // Get all shotguns with calibers
    const shotguns = await client.query(`
      SELECT caliber, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
      GROUP BY caliber
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Current shotgun calibers:');
    shotguns.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} shotguns`);
    });
    
    // Identify gauge-related calibers (should be shotgun only)
    const gaugeCalibers = [
      '12 GA', '12 Gauge', '12GA',
      '20 GA', '20 Gauge', '20GA', 
      '16 GA', '16 Gauge', '16GA',
      '28 GA', '28 Gauge', '28GA',
      '410 GA', '410 Gauge', '410'
    ];
    
    console.log('\n🔍 Identifying misplaced calibers...');
    
    // Check for gauge calibers in rifles (should be moved to shotguns)
    const rifleGaugeCalibersQuery = await client.query(`
      SELECT caliber, COUNT(*) as count, array_agg(sku) as skus
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND caliber IS NOT NULL 
        AND caliber != ''
        AND (
          caliber ILIKE '%GA%' OR 
          caliber ILIKE '%Gauge%' OR
          caliber = '410'
        )
      GROUP BY caliber
      ORDER BY count DESC
    `);
    
    console.log('\n❌ Gauge calibers found in rifles (should be shotguns):');
    rifleGaugeCalibersQuery.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} rifles - Sample SKUs: ${row.skus.slice(0, 3).join(', ')}`);
    });
    
    // Check for rifle calibers in shotguns (should be moved to rifles)
    const shotgunRifleCalibersQuery = await client.query(`
      SELECT caliber, COUNT(*) as count, array_agg(sku) as skus
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
        AND caliber NOT ILIKE '%GA%'
        AND caliber NOT ILIKE '%Gauge%'
        AND caliber != '410'
      GROUP BY caliber
      ORDER BY count DESC
    `);
    
    console.log('\n❌ Rifle calibers found in shotguns (should be rifles):');
    shotgunRifleCalibersQuery.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} shotguns - Sample SKUs: ${row.skus.slice(0, 3).join(', ')}`);
    });
    
    // Count total products that need to be moved
    const totalRifleToShotgun = rifleGaugeCalibersQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const totalShotgunToRifle = shotgunRifleCalibersQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    console.log('\n📋 Summary:');
    console.log(`  - Products to move from Rifles to Shotguns: ${totalRifleToShotgun}`);
    console.log(`  - Products to move from Shotguns to Rifles: ${totalShotgunToRifle}`);
    console.log(`  - Total products to recategorize: ${totalRifleToShotgun + totalShotgunToRifle}`);
    
    // Check for duplicate gauge formats that can be standardized
    console.log('\n🔄 Gauge format standardization opportunities:');
    const allGauges = [...rifles.rows, ...shotguns.rows]
      .filter(row => row.caliber.includes('GA') || row.caliber.includes('Gauge') || row.caliber === '410')
      .map(row => row.caliber);
    
    const uniqueGauges = [...new Set(allGauges)];
    console.log('  Current gauge formats:', uniqueGauges);
    
    // Suggest standardization
    console.log('\n💡 Suggested standardization:');
    console.log('  - 12 GA, 12 Gauge, 12GA → 12 Gauge');
    console.log('  - 20 GA, 20 Gauge, 20GA → 20 Gauge');
    console.log('  - 16 GA, 16 Gauge, 16GA → 16 Gauge');
    console.log('  - 28 GA, 28 Gauge, 28GA → 28 Gauge');
    console.log('  - 410 GA, 410 Gauge, 410 → 410 Gauge');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeRifleShotgunCalibers().catch(console.error);