/**
 * Check Handgun Caliber Data
 */

import { Pool } from 'pg';

async function checkHandgunCaliber() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Check handgun caliber coverage
    const coverage = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN caliber IS NOT NULL AND caliber != '' THEN 1 END) as with_caliber,
        COUNT(CASE WHEN caliber IS NULL OR caliber = '' THEN 1 END) as without_caliber
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
    `);
    
    console.log('📊 Handgun caliber coverage:', coverage.rows[0]);
    
    // Sample handgun data
    const samples = await client.query(`
      SELECT sku, name, caliber
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
      ORDER BY id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample handgun data:');
    samples.rows.forEach(row => {
      console.log(`${row.sku}: ${row.caliber || 'NO CALIBER'} (from: ${row.name.substring(0, 50)}...)`);
    });
    
    // Check caliber distribution
    const distribution = await client.query(`
      SELECT caliber, COUNT(*) as count
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
      GROUP BY caliber
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Handgun caliber distribution:');
    distribution.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} handguns`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHandgunCaliber().catch(console.error);