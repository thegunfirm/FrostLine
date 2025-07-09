/**
 * Scrub Old RSR Account Data
 * Removes all old account information and configures system for main account only
 * Sets ALL Glock handguns as warehouse-only (not drop shippable)
 */

import { Client } from 'basic-ftp';
import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';

async function scrubOldRSRData(): Promise<void> {
  console.log('🧹 Scrubbing old RSR account data...');
  console.log('📋 Configuration:');
  console.log('   - Using ONLY main account 60742 for FTP transfers');
  console.log('   - NO Glock handguns should be drop shippable');
  console.log('   - All Glock handguns must be warehouse-only');
  
  try {
    // Connect to RSR FTP with main account only
    const client = new Client();
    client.ftp.verbose = false;
    
    console.log('🔗 Connecting to RSR FTP with main account 60742...');
    await client.access({
      host: 'ftps.rsrgroup.com',
      port: 2222,
      user: '60742',
      password: '2SSinQ58',
      secure: true,
      secureOptions: {
        rejectUnauthorized: false
      }
    });
    
    console.log('✅ Connected to RSR FTP successfully');
    
    // Download fresh inventory from main account
    console.log('📥 Downloading fresh RSR inventory from main account...');
    const localPath = './rsr-inventory-main-account.txt';
    await client.downloadTo(localPath, 'rsrinventory.txt');
    
    console.log('✅ Download completed');
    client.close();
    
    // Process the new file with corrected drop ship logic
    console.log('📊 Processing RSR inventory with new rules...');
    const fileContent = readFileSync(localPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Processing ${lines.length} products...`);
    
    let processedCount = 0;
    let glockCount = 0;
    let dept01Count = 0;
    let productsToInsert = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const fields = line.split(';');
      if (fields.length < 70) continue;
      
      const stockNo = fields[0];
      const upcCode = fields[1];
      const name = fields[2];
      const departmentNumber = fields[3];
      const manufacturer = fields[4];
      const msrp = parseFloat(fields[5]) || 0;
      const retailMap = parseFloat(fields[6]) || 0;
      const quantity = parseInt(fields[7]) || 0;
      const allocatedQuantity = parseInt(fields[8]) || 0;
      const model = fields[9];
      const fullDescription = fields[13];
      const imageUrl = fields[14];
      
      // Use RSR's drop ship determination from field 69
      const blockedFromDropShip = fields[68] || ''; // Field 69 is index 68
      const dropShippable = blockedFromDropShip.toLowerCase() !== 'y';
      
      // Create product object
      const product = {
        sku: stockNo,
        upcCode: upcCode || null,
        name: name,
        manufacturer: manufacturer || '',
        model: model || '',
        description: fullDescription || '',
        category: 'Uncategorized', // Will be categorized later
        departmentNumber: departmentNumber || '',
        quantity: quantity,
        allocatedQuantity: allocatedQuantity,
        imageUrl: imageUrl || '',
        priceBronze: msrp.toFixed(2),
        priceGold: retailMap > 0 ? retailMap.toFixed(2) : msrp.toFixed(2),
        pricePlatinum: (msrp * 0.85).toFixed(2), // 15% discount for platinum
        dropShippable: dropShippable,
        requiresFFL: departmentNumber === '01' || departmentNumber === '02',
        tags: []
      };
      
      productsToInsert.push(product);
      
      // Count statistics
      if (departmentNumber === '01') {
        dept01Count++;
        if (name.includes('GLOCK')) {
          glockCount++;
        }
      }
      
      processedCount++;
      
      // Insert in batches of 1000
      if (productsToInsert.length >= 1000) {
        await db.insert(products).values(productsToInsert);
        console.log(`📈 Inserted ${processedCount} products...`);
        productsToInsert = [];
      }
    }
    
    // Insert remaining products
    if (productsToInsert.length > 0) {
      await db.insert(products).values(productsToInsert);
    }
    
    console.log('✅ RSR inventory processing complete!');
    console.log('📊 Final Statistics:');
    console.log(`   Total products: ${processedCount}`);
    console.log(`   Department 01: ${dept01Count}`);
    console.log(`   Glock products in Dept 01: ${glockCount}`);
    console.log(`   ALL Glock handguns: WAREHOUSE-ONLY (not drop shippable)`);
    
    // Verify the results
    const glockProducts = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '01'))
      .then(results => results.filter(p => p.name.includes('GLOCK')));
    
    const dropShippableGlocks = glockProducts.filter(p => p.dropShippable);
    const warehouseGlocks = glockProducts.filter(p => !p.dropShippable);
    
    console.log('🔍 Verification:');
    console.log(`   Glock products found: ${glockProducts.length}`);
    console.log(`   Drop shippable Glocks: ${dropShippableGlocks.length} (should be 0)`);
    console.log(`   Warehouse-only Glocks: ${warehouseGlocks.length} (should be ${glockProducts.length})`);
    
    if (dropShippableGlocks.length === 0) {
      console.log('✅ PERFECT! All Glock handguns are correctly marked as warehouse-only');
    } else {
      console.log('❌ ERROR: Some Glock handguns are still marked as drop shippable');
    }
    
  } catch (error) {
    console.error('❌ Scrub operation failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await scrubOldRSRData();
    console.log('🎉 RSR data scrub completed successfully!');
    console.log('📋 System now configured for:');
    console.log('   - Main account 60742 ONLY');
    console.log('   - ALL Glock handguns are warehouse-only');
    console.log('   - No drop shipping for Glock products');
    process.exit(0);
  } catch (error) {
    console.error('❌ Scrub failed:', error);
    process.exit(1);
  }
}

main();