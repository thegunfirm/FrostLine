/**
 * RSR Sync with Authentic Drop Ship Data
 * Updates database with real RSR Field 69 "Blocked from Drop Ship" values
 * Uses account 60742 with authentic credentials
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, count } from 'drizzle-orm';
import { Client } from 'basic-ftp';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RSR_CREDENTIALS = {
  username: '60742',
  password: '2SSinQ58' // Updated password for account 60742
};

async function downloadRSRInventory(): Promise<string> {
  const client = new Client();
  const localPath = join(process.cwd(), 'rsrinventory.txt');
  
  try {
    console.log('🔗 Connecting to RSR FTP server...');
    await client.access({
      host: 'ftps.rsrgroup.com',
      port: 2222,
      user: RSR_CREDENTIALS.username,
      password: RSR_CREDENTIALS.password,
      secure: true
    });
    
    console.log('📥 Downloading RSR inventory file...');
    await client.downloadTo(localPath, 'rsrinventory.txt');
    console.log('✅ RSR inventory file downloaded successfully');
    
    return localPath;
  } catch (error) {
    console.error('❌ FTP download failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

function parseRSRLine(line: string): any {
  // RSR uses pipe-delimited format
  const fields = line.split('|');
  
  if (fields.length < 77) {
    return null; // Invalid line
  }
  
  const stockNumber = fields[0]?.trim();
  const description = fields[2]?.trim();
  const blockedFromDropShip = fields[68]?.trim(); // Field 69 (0-based = 68)
  const dropShippable = blockedFromDropShip !== 'Y'; // "Y" means blocked, blank means allowed
  
  return {
    stockNumber,
    description,
    dropShippable,
    blockedFromDropShip
  };
}

async function updateDropShipData(): Promise<void> {
  const inventoryPath = join(process.cwd(), 'rsrinventory.txt');
  
  if (!existsSync(inventoryPath)) {
    console.log('📥 RSR inventory file not found, downloading...');
    await downloadRSRInventory();
  }
  
  console.log('📖 Reading RSR inventory file...');
  const fileContent = readFileSync(inventoryPath, 'utf-8');
  const lines = fileContent.split('\n');
  
  console.log(`📊 Processing ${lines.length} RSR inventory lines...`);
  
  let processed = 0;
  let updated = 0;
  let dropShipTrue = 0;
  let dropShipFalse = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const rsrData = parseRSRLine(line);
    if (!rsrData || !rsrData.stockNumber) continue;
    
    try {
      // Update product with authentic drop ship data
      const result = await db
        .update(products)
        .set({ 
          dropShippable: rsrData.dropShippable
        })
        .where(eq(products.sku, rsrData.stockNumber))
        .returning({ id: products.id });
      
      if (result.length > 0) {
        updated++;
        if (rsrData.dropShippable) {
          dropShipTrue++;
        } else {
          dropShipFalse++;
        }
      }
      
      processed++;
      
      if (processed % 1000 === 0) {
        console.log(`📈 Processed ${processed} products, updated ${updated} (${dropShipTrue} dropship, ${dropShipFalse} warehouse)`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating product ${rsrData.stockNumber}:`, error);
    }
  }
  
  console.log('✅ RSR drop ship data sync complete!');
  console.log(`📊 Final Stats:`);
  console.log(`   Total processed: ${processed}`);
  console.log(`   Total updated: ${updated}`);
  console.log(`   Drop ship eligible (63824): ${dropShipTrue}`);
  console.log(`   Warehouse only (60742): ${dropShipFalse}`);
  
  // Log completion to sync status
  const statusUpdate = {
    timestamp: new Date().toISOString(),
    phase: 'complete',
    totalProcessed: processed,
    totalUpdated: updated,
    dropShipTrue,
    dropShipFalse,
    message: 'RSR drop ship data sync completed successfully'
  };
  
  writeFileSync(
    join(process.cwd(), 'sync-status.json'),
    JSON.stringify(statusUpdate, null, 2)
  );
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting RSR Drop Ship Data Sync...');
    console.log(`📡 Using RSR account: ${RSR_CREDENTIALS.username}`);
    
    await updateDropShipData();
    
    console.log('🎉 RSR sync with drop ship data completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ RSR sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
main();