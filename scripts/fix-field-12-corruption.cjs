#!/usr/bin/env node

const fs = require('fs');
const { Client } = require('pg');

async function fixField12Corruption() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('🔗 Connected to database');

  try {
    // Get RSR file data to build Field 1 → Field 12 mapping
    const rsrFile = 'server/data/rsr/downloads/fulfillment-inv-new.txt';
    if (!fs.existsSync(rsrFile)) {
      throw new Error('RSR file not found: ' + rsrFile);
    }

    console.log('📄 Reading RSR file for Field 12 data...');
    const rsrData = fs.readFileSync(rsrFile, 'utf8');
    const lines = rsrData.split('\n').filter(line => line.trim());
    
    // Build mapping: RSR Stock Number (Field 1) → Manufacturer Part Number (Field 12)
    const field1ToField12 = new Map();
    let validMappings = 0;

    for (const line of lines) {
      const fields = line.split(';');
      if (fields.length < 12) continue;
      
      const field1_stockNumber = fields[0]; // Field 1: RSR Stock Number
      const field12_mfgPartNumber = fields[11]; // Field 12: Manufacturer Part Number (0-indexed)
      
      if (field1_stockNumber && field12_mfgPartNumber && field1_stockNumber !== field12_mfgPartNumber) {
        field1ToField12.set(field1_stockNumber, field12_mfgPartNumber);
        validMappings++;
      }
    }

    console.log(`📊 Built mapping table with ${validMappings} RSR Stock Number → Manufacturer Part Number entries`);

    // Find corrupted products where SKU = RSR Stock Number
    const corruptedResult = await client.query(
      'SELECT id, sku, rsr_stock_number, name FROM products WHERE sku = rsr_stock_number'
    );
    
    console.log(`🔍 Found ${corruptedResult.rows.length} corrupted products with SKU = RSR Stock Number`);

    let fixed = 0;
    let notFound = 0;

    // Fix each corrupted product using RSR Field 12 data
    for (const product of corruptedResult.rows) {
      const correctSku = field1ToField12.get(product.rsr_stock_number);
      
      if (correctSku) {
        await client.query(
          'UPDATE products SET sku = $1, manufacturer_part_number = $1 WHERE id = $2',
          [correctSku, product.id]
        );
        fixed++;
        
        if (fixed % 100 === 0) {
          console.log(`✅ Fixed ${fixed} products...`);
        }
      } else {
        notFound++;
      }
    }

    console.log(`\n🎉 FIELD 12 CORRUPTION FIX COMPLETE:`);
    console.log(`   ✅ Fixed: ${fixed} products`);
    console.log(`   ❌ Not found in RSR: ${notFound} products`);
    console.log(`   📊 Fix rate: ${((fixed/(fixed+notFound))*100).toFixed(1)}%`);

    // Verify the fix
    const stillCorruptedResult = await client.query(
      'SELECT COUNT(*) as count FROM products WHERE sku = rsr_stock_number'
    );
    
    console.log(`\n🔍 Verification: ${stillCorruptedResult.rows[0].count} products still corrupted`);

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixField12Corruption()
  .then(() => {
    console.log('\n✅ Field 12 corruption fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Field 12 corruption fix failed:', error.message);
    process.exit(1);
  });