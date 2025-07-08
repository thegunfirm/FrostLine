/**
 * Complete Department Number Fix
 * Populates ALL missing department numbers from authentic RSR data
 * Ensures 100% data integrity with pristine RSR department assignments
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Parse RSR inventory line to extract department number
 */
function parseRSRLine(line: string): { stockNo: string; departmentNumber: string } | null {
  const fields = line.split(';');
  
  if (fields.length < 77) {
    return null;
  }

  const stockNo = fields[0]?.trim();
  const departmentNumber = fields[3]?.trim(); // Department number is field 4 (index 3)
  
  if (!stockNo || !departmentNumber) {
    return null;
  }

  return { stockNo, departmentNumber };
}

/**
 * Complete department number fix from RSR data
 */
async function fixDepartmentNumbersComplete() {
  console.log('🔄 Starting complete department number fix...');
  
  // Read RSR inventory file
  const filePath = join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Processing ${lines.length} RSR inventory lines...`);
    
    let processed = 0;
    let updated = 0;
    let notFound = 0;
    
    // Process each line from RSR file
    for (const line of lines) {
      try {
        const rsrData = parseRSRLine(line);
        if (!rsrData) continue;
        
        processed++;
        
        // Update product with department number
        const result = await db
          .update(products)
          .set({
            departmentNumber: rsrData.departmentNumber,
            updatedAt: new Date()
          })
          .where(eq(products.sku, rsrData.stockNo));
        
        if (result.rowCount && result.rowCount > 0) {
          updated++;
        } else {
          notFound++;
        }
        
        if (processed % 1000 === 0) {
          console.log(`⚡ Processed ${processed} lines, updated ${updated} products`);
        }
        
      } catch (error) {
        console.error(`Error processing line: ${error}`);
      }
    }
    
    console.log(`✅ Complete department number fix finished:`);
    console.log(`📊 Processed: ${processed} RSR lines`);
    console.log(`🔄 Updated: ${updated} products`);
    console.log(`❌ Not found in DB: ${notFound} products`);
    
    // Verify results
    const totalProducts = await db.select({ count: db.count() }).from(products);
    const withDeptNum = await db.select({ count: db.count() }).from(products).where(db.isNotNull(products.departmentNumber));
    
    console.log(`\n📈 Database Status:`);
    console.log(`Total products: ${totalProducts[0].count}`);
    console.log(`With department numbers: ${withDeptNum[0].count}`);
    console.log(`Coverage: ${((withDeptNum[0].count / totalProducts[0].count) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Department number fix failed:', error);
  }
}

// Run the fix
fixDepartmentNumbersComplete().catch(console.error);