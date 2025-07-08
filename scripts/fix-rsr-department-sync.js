/**
 * Fix RSR Department Sync - Properly Import All Department Numbers
 * Reads the complete RSR file and ensures all department numbers are stored correctly
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const RSR_FILE_PATH = path.join(__dirname, '../server/data/rsr/downloads/rsrinventory-new.txt');

/**
 * Read and process complete RSR file with proper department number storage
 */
async function fixRSRDepartmentSync() {
  console.log('🔧 Starting RSR department number sync fix...');
  
  try {
    // Read the complete RSR file
    const fileContent = fs.readFileSync(RSR_FILE_PATH, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📂 RSR file contains ${lines.length} total products`);
    
    let processed = 0;
    let updated = 0;
    let dept01Count = 0;
    let dept05Count = 0;
    let otherDeptCount = 0;
    
    // Process each line and update department numbers
    for (const line of lines) {
      const fields = line.split(';');
      
      if (fields.length < 20) continue; // Skip malformed lines
      
      const stockNumber = fields[0];
      const departmentNumber = fields[3];
      const productDescription = fields[2];
      
      if (!stockNumber || !departmentNumber) continue;
      
      // Count departments
      if (departmentNumber === '01') dept01Count++;
      else if (departmentNumber === '05') dept05Count++;
      else otherDeptCount++;
      
      // Update department number in database
      try {
        const result = await pool.query(
          'UPDATE products SET department_number = $1 WHERE sku = $2',
          [departmentNumber, stockNumber]
        );
        
        if (result.rowCount > 0) {
          updated++;
        }
      } catch (error) {
        console.error(`Error updating ${stockNumber}:`, error.message);
      }
      
      processed++;
      
      if (processed % 1000 === 0) {
        console.log(`⚡ Processed ${processed} products, updated ${updated} department numbers...`);
      }
    }
    
    console.log('📊 RSR File Department Distribution:');
    console.log(`  - Department 01 (Handguns): ${dept01Count} products`);
    console.log(`  - Department 05 (Long Guns): ${dept05Count} products`);
    console.log(`  - Other Departments: ${otherDeptCount} products`);
    console.log(`  - Total: ${dept01Count + dept05Count + otherDeptCount} products`);
    
    // Verify database update
    const dbStats = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN department_number = '01' THEN 1 END) as dept_01,
        COUNT(CASE WHEN department_number = '05' THEN 1 END) as dept_05,
        COUNT(CASE WHEN department_number IS NOT NULL THEN 1 END) as with_dept_num
      FROM products
    `);
    
    const stats = dbStats.rows[0];
    console.log('📊 Database After Update:');
    console.log(`  - Total Products: ${stats.total_products}`);
    console.log(`  - Department 01: ${stats.dept_01} products`);
    console.log(`  - Department 05: ${stats.dept_05} products`);
    console.log(`  - With Department Numbers: ${stats.with_dept_num} products`);
    
    console.log(`✅ Fixed RSR department sync: ${updated} products updated`);
    
  } catch (error) {
    console.error('💥 RSR department sync fix failed:', error);
    throw error;
  }
}

// Run the fix
fixRSRDepartmentSync()
  .then(() => {
    console.log('✅ RSR department sync fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RSR department sync fix failed:', error);
    process.exit(1);
  });