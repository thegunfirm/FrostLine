/**
 * Populate Department Numbers from RSR Data
 * Updates products with department numbers from the authentic RSR file
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';

async function populateDepartmentNumbers() {
  console.log('🔄 Populating department numbers from RSR data...');

  const rsrFilePath = '/home/runner/workspace/server/data/rsr/downloads/rsrinventory-new.txt';
  
  if (!fs.existsSync(rsrFilePath)) {
    console.error('❌ RSR inventory file not found');
    return;
  }

  const fileContent = fs.readFileSync(rsrFilePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 Found ${lines.length} RSR products`);

  let updatedCount = 0;
  const batchSize = 1000;
  
  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lines.length / batchSize)}`);
    
    for (const line of batch) {
      const fields = line.split(';');
      
      if (fields.length < 5) continue;
      
      const stockNo = fields[0];      // SKU
      const departmentNumber = fields[3]; // Department number (01, 02, 05, etc.)
      
      if (!stockNo || !departmentNumber) continue;
      
      try {
        // Update product with department number
        const result = await db.update(products)
          .set({ departmentNumber: departmentNumber })
          .where(eq(products.sku, stockNo));
        
        updatedCount++;
      } catch (error) {
        // Skip products that don't exist in database
        continue;
      }
    }
  }

  console.log(`✅ Updated ${updatedCount} products with department numbers`);

  // Verify the update
  const deptCounts = await db.select()
    .from(products)
    .where(eq(products.departmentNumber, '01'));
  
  console.log(`🔫 Department 01 (Handguns): ${deptCounts.length} products`);
}

populateDepartmentNumbers().catch(console.error);