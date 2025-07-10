/**
 * Final Complete RSR Migration
 * Loads all 29,813 RSR products using the most reliable approach
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { readFileSync } from 'fs';

async function finalCompleteMigration() {
  console.log('🚀 Starting final complete RSR migration...');
  console.log('Target: 29,813 RSR products');
  
  // Clear existing data
  await db.delete(products);
  console.log('✅ Cleared existing data');
  
  // Load RSR data
  const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 RSR file contains: ${lines.length.toLocaleString()} products`);
  
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;
  const batchSize = 5; // Extremely small batches for maximum reliability
  let currentBatch: any[] = [];
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      const fields = line.split(';');
      if (fields.length < 70) {
        totalErrors++;
        continue;
      }
      
      const stockNo = fields[0];
      if (!stockNo || stockNo.trim() === '') {
        totalErrors++;
        continue;
      }
      
      // Parse all fields
      const upcCode = fields[1];
      const name = fields[2];
      const departmentNumber = fields[3];
      const manufacturer = fields[4];
      const msrp = parseFloat(fields[5]) || 0;
      const dealerPrice = parseFloat(fields[6]) || 0;
      const weight = parseFloat(fields[7]) || 0;
      const quantity = parseInt(fields[8]) || 0;
      const model = fields[9];
      const fullDescription = fields[13];
      const imageUrl = fields[14];
      const retailMAP = parseFloat(fields[70]) || 0;
      
      // RSR field 68 for drop ship determination
      const blockedFromDropShip = fields[68] || '';
      const dropShippable = blockedFromDropShip.toLowerCase() !== 'y';
      
      // Create product object
      const product = {
        sku: stockNo,
        upcCode: upcCode || null,
        name: name,
        manufacturer: manufacturer || '',
        model: model || '',
        description: fullDescription || '',
        category: 'Uncategorized',
        departmentNumber: departmentNumber || '',
        stockQuantity: quantity,
        weight: weight.toString(),
        imageUrl: imageUrl || '',
        priceBronze: msrp.toFixed(2),
        priceGold: retailMAP > 0 ? retailMAP.toFixed(2) : msrp.toFixed(2),
        pricePlatinum: (dealerPrice * 1.02).toFixed(2),
        priceWholesale: dealerPrice.toFixed(2),
        dropShippable: dropShippable,
        requiresFFL: ['01', '02', '05', '06'].includes(departmentNumber),
        tags: []
      };
      
      currentBatch.push(product);
      totalProcessed++;
      
      // Insert when batch is full
      if (currentBatch.length >= batchSize) {
        try {
          await db.insert(products).values(currentBatch);
          totalInserted += currentBatch.length;
          currentBatch = [];
        } catch (insertError) {
          console.error(`Insert error at product ${totalProcessed}:`, insertError.message);
          totalErrors += currentBatch.length;
          currentBatch = [];
        }
      }
      
      // Progress updates
      if (totalProcessed % 500 === 0) {
        const percentage = ((totalProcessed / lines.length) * 100).toFixed(1);
        console.log(`📈 Progress: ${totalProcessed.toLocaleString()}/${lines.length.toLocaleString()} (${percentage}%) - Inserted: ${totalInserted.toLocaleString()}, Errors: ${totalErrors.toLocaleString()}`);
      }
      
    } catch (error) {
      totalErrors++;
      if (totalErrors % 100 === 0) {
        console.error(`Processing error at line ${i + 1}:`, error.message);
      }
    }
  }
  
  // Insert remaining batch
  if (currentBatch.length > 0) {
    try {
      await db.insert(products).values(currentBatch);
      totalInserted += currentBatch.length;
    } catch (insertError) {
      console.error('Final batch insert error:', insertError.message);
      totalErrors += currentBatch.length;
    }
  }
  
  console.log('✅ Final complete RSR migration finished!');
  console.log(`📊 Results:`);
  console.log(`   - Lines processed: ${totalProcessed.toLocaleString()}`);
  console.log(`   - Products inserted: ${totalInserted.toLocaleString()}`);
  console.log(`   - Errors: ${totalErrors.toLocaleString()}`);
  console.log(`   - Success rate: ${((totalInserted / totalProcessed) * 100).toFixed(1)}%`);
  
  // Final database verification
  const finalCount = await db.select().from(products);
  console.log(`🔍 Database verification: ${finalCount.length.toLocaleString()} products confirmed`);
  
  if (finalCount.length >= 29000) {
    console.log('🎉 SUCCESS: Complete RSR catalog loaded!');
  } else {
    console.log(`⚠️  Partial load: ${finalCount.length.toLocaleString()} of 29,813 products`);
  }
  
  return finalCount.length;
}

// Execute migration
finalCompleteMigration().then(count => {
  console.log(`Migration completed with ${count.toLocaleString()} products`);
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});