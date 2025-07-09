/**
 * Sync New RSR Account Data
 * Downloads fresh inventory from RSR account 60742 to get complete 321 Glock products
 */

import { Client } from 'basic-ftp';
import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { readFileSync, writeFileSync } from 'fs';

async function syncNewRSRAccount(): Promise<void> {
  console.log('🚀 Starting sync with new RSR account 60742...');
  
  try {
    // Connect to RSR FTP with new account
    const client = new Client();
    client.ftp.verbose = false;
    
    console.log('🔗 Connecting to RSR FTP server...');
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
    
    // Download fresh inventory file
    console.log('📥 Downloading fresh RSR inventory...');
    const localPath = './rsr-inventory-new-account.txt';
    await client.downloadTo(localPath, 'rsrinventory.txt');
    
    console.log('✅ Download completed');
    client.close();
    
    // Process the new file
    console.log('📊 Processing new RSR inventory...');
    const fileContent = readFileSync(localPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Processing ${lines.length} products...`);
    
    let processedCount = 0;
    let glockCount = 0;
    let dept01Count = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const fields = line.split(';');
      if (fields.length < 70) continue;
      
      const stockNo = fields[0];
      const name = fields[2];
      const departmentNumber = fields[3];
      const manufacturer = fields[4];
      
      // Count statistics
      if (departmentNumber === '01') {
        dept01Count++;
        if (name.includes('GLOCK')) {
          glockCount++;
        }
      }
      
      processedCount++;
      
      if (processedCount % 5000 === 0) {
        console.log(`📈 Processed ${processedCount} products...`);
      }
    }
    
    console.log('📊 New RSR Account Analysis:');
    console.log(`   Total products: ${processedCount}`);
    console.log(`   Department 01: ${dept01Count}`);
    console.log(`   Glock products in Dept 01: ${glockCount}`);
    console.log(`   Expected Glock count: 321`);
    console.log(`   Difference: ${321 - glockCount}`);
    
    // Compare with current database
    const currentGlockCount = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '01'))
      .then(results => results.filter(p => p.name.includes('GLOCK')).length);
    
    console.log(`📊 Database comparison:`);
    console.log(`   Current Glock count: ${currentGlockCount}`);
    console.log(`   New RSR account count: ${glockCount}`);
    console.log(`   Missing products: ${321 - Math.max(currentGlockCount, glockCount)}`);
    
    if (glockCount === 321) {
      console.log('✅ Perfect! New RSR account has exactly 321 Glock products');
    } else if (glockCount > currentGlockCount) {
      console.log('📈 New RSR account has more Glock products than current database');
    } else {
      console.log('⚠️  New RSR account has fewer Glock products than expected');
    }
    
  } catch (error) {
    console.error('❌ RSR sync failed:', error);
    
    // If FTP fails, let's analyze what we have
    console.log('🔍 Analyzing current situation...');
    
    const currentStats = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    const glockProducts = currentStats.filter(p => p.name.includes('GLOCK'));
    const dropShippableGlocks = glockProducts.filter(p => p.dropShippable);
    const warehouseGlocks = glockProducts.filter(p => !p.dropShippable);
    
    console.log('📊 Current Database Analysis:');
    console.log(`   Total Dept 01: ${currentStats.length}`);
    console.log(`   Glock products: ${glockProducts.length}`);
    console.log(`   Drop shippable Glocks: ${dropShippableGlocks.length}`);
    console.log(`   Warehouse only Glocks: ${warehouseGlocks.length}`);
    console.log(`   Missing to reach 321: ${321 - glockProducts.length}`);
    
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await syncNewRSRAccount();
    console.log('🎉 New RSR account sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();