/**
 * Batch Department Number Update
 * Efficiently updates all missing department numbers using batch processing
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function batchDepartmentUpdate() {
  console.log('🔄 Starting batch department number update...');
  
  // Read RSR inventory file
  const filePath = join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Processing ${lines.length} RSR inventory lines...`);
    
    // Build update cases for batch processing
    const updateCases: string[] = [];
    let processed = 0;
    
    for (const line of lines) {
      const fields = line.split(';');
      
      if (fields.length < 77) continue;
      
      const stockNo = fields[0]?.trim();
      const departmentNumber = fields[3]?.trim();
      
      if (!stockNo || !departmentNumber) continue;
      
      // Add to batch update case
      updateCases.push(`WHEN sku = '${stockNo.replace(/'/g, "''")}' THEN '${departmentNumber}'`);
      processed++;
      
      // Process in batches of 1000
      if (updateCases.length === 1000) {
        await processBatch(updateCases);
        updateCases.length = 0;
      }
    }
    
    // Process remaining cases
    if (updateCases.length > 0) {
      await processBatch(updateCases);
    }
    
    console.log(`✅ Batch update completed. Processed ${processed} records.`);
    
    // Verify results
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(department_number) as with_dept,
        COUNT(CASE WHEN department_number IS NULL OR department_number = '' THEN 1 END) as without_dept
      FROM products
    `);
    
    const stats = result.rows[0] as any;
    console.log(`📈 Final Status:`);
    console.log(`Total products: ${stats.total}`);
    console.log(`With department numbers: ${stats.with_dept}`);
    console.log(`Without department numbers: ${stats.without_dept}`);
    console.log(`Coverage: ${((stats.with_dept / stats.total) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Batch update failed:', error);
  }
}

async function processBatch(updateCases: string[]) {
  if (updateCases.length === 0) return;
  
  const caseStatement = updateCases.join('\n        ');
  
  await db.execute(sql`
    UPDATE products 
    SET department_number = CASE 
        ${sql.raw(caseStatement)}
    END
    WHERE sku IN (${sql.join(updateCases.map(c => {
      const match = c.match(/WHEN sku = '([^']+)'/);
      return match ? sql`${match[1]}` : sql`''`;
    }), sql`, `)})
  `);
  
  console.log(`⚡ Updated batch of ${updateCases.length} products`);
}

// Run the update
batchDepartmentUpdate().catch(console.error);