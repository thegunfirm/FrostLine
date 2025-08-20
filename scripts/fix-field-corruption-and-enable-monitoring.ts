/**
 * Fix Field Corruption and Enable Daily Monitoring
 * 
 * This script corrects the business logic error where RSR distributor codes
 * were incorrectly used as customer-facing SKUs instead of manufacturer part numbers.
 * 
 * After correction, enables daily monitoring to ensure data integrity.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Parse RSR inventory line to extract correct field mapping
 */
function parseRSRLine(line: string) {
  if (!line || line.trim() === '') return null;
  
  const fields = line.split(';');
  if (fields.length < 77) return null;
  
  return {
    rsrStockNumber: fields[0]?.trim(),                 // Field 1: RSR distributor code (for ordering)
    upc: fields[1]?.trim(),                           // Field 2: UPC code
    description: fields[2]?.trim(),                   // Field 3: Product description
    departmentNumber: fields[3]?.trim(),              // Field 4: Department number
    manufacturerId: fields[4]?.trim(),                // Field 5: Manufacturer ID
    retailPrice: parseFloat(fields[5]) || 0,          // Field 6: MSRP
    rsrPrice: parseFloat(fields[6]) || 0,             // Field 7: RSR dealer price
    weight: parseFloat(fields[7]) || 0,               // Field 8: Weight
    inventoryQuantity: parseInt(fields[8]) || 0,      // Field 9: Quantity
    model: fields[9]?.trim(),                         // Field 10: Model
    manufacturer: fields[10]?.trim(),                 // Field 11: Full manufacturer name
    manufacturerPartNumber: fields[11]?.trim(),       // Field 12: MANUFACTURER PART NUMBER (customer-facing SKU)
    allocated: fields[12]?.trim(),                    // Field 13: Allocated/closeout/deleted
    fullDescription: fields[13]?.trim(),              // Field 14: Expanded description
    imageName: fields[14]?.trim()                     // Field 15: Image name
  };
}

/**
 * Fix corrupted field mapping
 */
async function fixFieldCorruption() {
  console.log('🔧 Starting field corruption fix...');
  
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  if (!fs.existsSync(rsrDataPath)) {
    console.error('❌ RSR inventory file not found. Please ensure data is available.');
    return;
  }

  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(`📋 Processing ${lines.length} RSR records for field correction...`);
  
  let processed = 0;
  let corrected = 0;
  let errors = 0;
  let skipped = 0;

  for (const line of lines) {
    try {
      const rsrProduct = parseRSRLine(line);
      if (!rsrProduct || !rsrProduct.rsrStockNumber) {
        skipped++;
        continue;
      }

      processed++;

      // Skip if no manufacturer part number available
      if (!rsrProduct.manufacturerPartNumber || rsrProduct.manufacturerPartNumber === rsrProduct.rsrStockNumber) {
        if (processed % 1000 === 0) {
          console.log(`📊 Progress: ${processed}/${lines.length} (${corrected} corrected, ${errors} errors, ${skipped} skipped)`);
        }
        continue;
      }

      // Find products that currently use RSR stock number as SKU
      const corruptedProducts = await db.select()
        .from(products)
        .where(eq(products.sku, rsrProduct.rsrStockNumber));

      if (corruptedProducts.length > 0) {
        for (const product of corruptedProducts) {
          // Update to use manufacturer part number as customer-facing SKU
          await db.update(products)
            .set({
              sku: rsrProduct.manufacturerPartNumber,           // FIXED: Customer-facing SKU
              rsrStockNumber: rsrProduct.rsrStockNumber,        // RSR code for ordering
              manufacturerPartNumber: rsrProduct.manufacturerPartNumber,
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));
          
          corrected++;
          console.log(`✅ Fixed: ${rsrProduct.rsrStockNumber} → ${rsrProduct.manufacturerPartNumber} (${product.name})`);
        }
      }

      if (processed % 1000 === 0) {
        console.log(`📊 Progress: ${processed}/${lines.length} (${corrected} corrected, ${errors} errors, ${skipped} skipped)`);
      }

    } catch (error: any) {
      errors++;
      console.error(`❌ Error processing record: ${error.message}`);
    }
  }

  console.log('\n🎉 Field corruption fix complete!');
  console.log(`📋 Total processed: ${processed}`);
  console.log(`✅ Records corrected: ${corrected}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  
  return { processed, corrected, errors, skipped };
}

/**
 * Verify fix was successful
 */
async function verifyFix() {
  console.log('\n🔍 Verifying fix...');
  
  const corruptedCount = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  const totalProducts = await db.select().from(products);
  
  console.log(`📊 Verification Results:`);
  console.log(`   Total products: ${totalProducts.length}`);
  console.log(`   Still corrupted: ${corruptedCount.length}`);
  console.log(`   Corruption rate: ${(corruptedCount.length / totalProducts.length * 100).toFixed(2)}%`);
  
  if (corruptedCount.length === 0) {
    console.log('🎉 SUCCESS: All field corruption has been fixed!');
  } else {
    console.log(`⚠️  WARNING: ${corruptedCount.length} products still have corruption`);
  }
  
  return corruptedCount.length === 0;
}

/**
 * Enable daily monitoring
 */
async function enableDailyMonitoring() {
  console.log('\n🔄 Setting up daily monitoring...');
  
  // Create monitoring config file
  const monitoringConfig = {
    enabled: true,
    schedule: '0 6 * * *', // Daily at 6 AM
    rsrDataPath: 'server/data/rsr/downloads/rsrinventory-new.txt',
    checkFields: ['sku', 'rsrStockNumber', 'manufacturerPartNumber'],
    alertOnCorruption: true,
    autoFix: true, // Automatically fix detected corruption
    lastRun: null,
    createdAt: new Date().toISOString(),
    description: 'Daily monitoring to ensure RSR field mapping integrity'
  };
  
  const configPath = path.join(process.cwd(), 'server', 'config', 'rsr-monitoring.json');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(monitoringConfig, null, 2));
  
  console.log('✅ Daily monitoring enabled');
  console.log(`   Config saved to: ${configPath}`);
  console.log(`   Schedule: Daily at 6 AM`);
  console.log(`   Auto-fix: Enabled`);
  
  return monitoringConfig;
}

/**
 * Run the complete fix and monitoring setup
 */
async function main() {
  try {
    console.log('🚀 Starting RSR Field Corruption Fix and Monitoring Setup\n');
    
    // Step 1: Fix existing corruption
    const fixResults = await fixFieldCorruption();
    
    // Step 2: Verify fix was successful
    const isFixed = await verifyFix();
    
    // Step 3: Enable daily monitoring
    if (isFixed) {
      const monitoringConfig = await enableDailyMonitoring();
      
      console.log('\n🎉 COMPLETE: Field corruption fixed and monitoring enabled');
      console.log('📈 System will now monitor daily for proper field separation');
      console.log('🔧 Any future corruption will be automatically detected and fixed');
    } else {
      console.log('\n⚠️  Fix incomplete - monitoring not enabled until corruption is fully resolved');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixFieldCorruption, verifyFix, enableDailyMonitoring };