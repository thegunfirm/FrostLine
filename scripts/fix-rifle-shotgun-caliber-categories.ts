/**
 * Fix Rifle and Shotgun Caliber Categories
 * Move gauge calibers from rifles to shotguns, and rifle calibers from shotguns to rifles
 */

import { Pool } from 'pg';

async function fixRifleShotgunCaliberCategories() {
  console.log('🔧 Fixing rifle and shotgun caliber categories...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Step 1: Move gauge calibers from rifles to shotguns
    console.log('\n📋 Step 1: Moving gauge calibers from rifles to shotguns...');
    
    const rifleToShotgunQuery = `
      UPDATE products 
      SET category = 'Shotguns' 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND caliber IS NOT NULL 
        AND caliber != ''
        AND (
          caliber ILIKE '%GA%' OR 
          caliber ILIKE '%Gauge%' OR
          caliber = '410'
        )
    `;
    
    const rifleToShotgunResult = await client.query(rifleToShotgunQuery);
    console.log(`✅ Moved ${rifleToShotgunResult.rowCount} products from rifles to shotguns`);
    
    // Step 2: Move rifle calibers from shotguns to rifles
    console.log('\n📋 Step 2: Moving rifle calibers from shotguns to rifles...');
    
    const shotgunToRifleQuery = `
      UPDATE products 
      SET category = 'Rifles' 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
        AND caliber IS NOT NULL 
        AND caliber != ''
        AND caliber NOT ILIKE '%GA%'
        AND caliber NOT ILIKE '%Gauge%'
        AND caliber != '410'
    `;
    
    const shotgunToRifleResult = await client.query(shotgunToRifleQuery);
    console.log(`✅ Moved ${shotgunToRifleResult.rowCount} products from shotguns to rifles`);
    
    // Step 3: Standardize gauge formats
    console.log('\n📋 Step 3: Standardizing gauge formats...');
    
    // Standardize 12 GA variations to 12 Gauge
    const update12GA = await client.query(`
      UPDATE products 
      SET caliber = '12 Gauge' 
      WHERE caliber IN ('12 GA', '12GA')
    `);
    console.log(`✅ Standardized ${update12GA.rowCount} products to "12 Gauge"`);
    
    // Standardize 20 GA variations to 20 Gauge
    const update20GA = await client.query(`
      UPDATE products 
      SET caliber = '20 Gauge' 
      WHERE caliber IN ('20 GA', '20GA')
    `);
    console.log(`✅ Standardized ${update20GA.rowCount} products to "20 Gauge"`);
    
    // Standardize 410 to 410 Gauge
    const update410 = await client.query(`
      UPDATE products 
      SET caliber = '410 Gauge' 
      WHERE caliber = '410'
    `);
    console.log(`✅ Standardized ${update410.rowCount} products to "410 Gauge"`);
    
    // Step 4: Verify the results
    console.log('\n📊 Step 4: Verifying results...');
    
    const rifleCalibersAfter = await client.query(`
      SELECT caliber, COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND caliber IS NOT NULL 
        AND caliber != ''
        AND (caliber ILIKE '%GA%' OR caliber ILIKE '%Gauge%' OR caliber = '410')
      GROUP BY caliber
      ORDER BY count DESC
    `);
    
    const shotgunCalibersAfter = await client.query(`
      SELECT caliber, COUNT(*) as count
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
    
    if (rifleCalibersAfter.rowCount === 0) {
      console.log('✅ No gauge calibers remaining in rifles');
    } else {
      console.log('❌ Still have gauge calibers in rifles:');
      rifleCalibersAfter.rows.forEach(row => {
        console.log(`  ${row.caliber}: ${row.count} rifles`);
      });
    }
    
    if (shotgunCalibersAfter.rowCount === 0) {
      console.log('✅ No rifle calibers remaining in shotguns');
    } else {
      console.log('❌ Still have rifle calibers in shotguns:');
      shotgunCalibersAfter.rows.forEach(row => {
        console.log(`  ${row.caliber}: ${row.count} shotguns`);
      });
    }
    
    // Step 5: Get final counts
    console.log('\n📊 Final category counts:');
    
    const finalRifleCount = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
    `);
    
    const finalShotgunCount = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Shotguns'
    `);
    
    console.log(`✅ Final rifle count: ${finalRifleCount.rows[0].count}`);
    console.log(`✅ Final shotgun count: ${finalShotgunCount.rows[0].count}`);
    
    // Step 6: Show sample of standardized gauge formats
    console.log('\n📋 Sample standardized shotgun calibers:');
    const sampleShotgunCalibers = await client.query(`
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
    
    sampleShotgunCalibers.rows.forEach(row => {
      console.log(`  ${row.caliber}: ${row.count} shotguns`);
    });
    
    console.log('\n🎉 Rifle and shotgun caliber categorization complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixRifleShotgunCaliberCategories().catch(console.error);