/**
 * Check Current Sync Status
 * Quick status check for RSR sync progress
 */

const { db } = require('../server/db');
const { products } = require('../shared/schema');
const { count, eq } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function checkSyncStatus() {
  console.log('📊 RSR Sync Status Check');
  console.log('═'.repeat(50));
  
  try {
    // Database statistics
    const totalProducts = await db.select({ count: count() }).from(products);
    const dropShippableCount = await db.select({ count: count() }).from(products).where(eq(products.dropShippable, true));
    const warehouseOnlyCount = await db.select({ count: count() }).from(products).where(eq(products.dropShippable, false));
    
    console.log(`📦 Total Products: ${totalProducts[0].count}`);
    console.log(`🚚 Drop Shippable (Account 63824): ${dropShippableCount[0].count}`);
    console.log(`🏭 Warehouse Only (Account 60742): ${warehouseOnlyCount[0].count}`);
    console.log('');
    
    // Check for recent sync activity
    const logFile = path.join(process.cwd(), 'sync-log.txt');
    if (fs.existsSync(logFile)) {
      const logStats = fs.statSync(logFile);
      const lastModified = new Date(logStats.mtime);
      const minutesAgo = Math.round((new Date() - lastModified) / 60000);
      
      console.log(`📝 Last Sync Activity: ${minutesAgo} minutes ago`);
      
      // Show recent log entries
      const logs = fs.readFileSync(logFile, 'utf-8').split('\n').filter(line => line.trim());
      if (logs.length > 0) {
        console.log('Recent Activity:');
        logs.slice(-5).forEach(log => console.log(`  ${log}`));
      }
    } else {
      console.log('📝 No recent sync activity found');
    }
    
    console.log('');
    console.log('═'.repeat(50));
    
    // Business logic validation
    const percentDropShippable = Math.round((dropShippableCount[0].count / totalProducts[0].count) * 100);
    console.log(`💼 Business Logic Status:`);
    console.log(`   ${percentDropShippable}% products can be drop shipped`);
    console.log(`   ${100 - percentDropShippable}% products require warehouse fulfillment`);
    
    if (dropShippableCount[0].count === totalProducts[0].count) {
      console.log('⚠️  Warning: All products marked as drop shippable');
      console.log('   Run sync to update with authentic RSR data');
    } else {
      console.log('✅ Dual account logic properly configured');
    }
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error.message);
  }
}

checkSyncStatus();