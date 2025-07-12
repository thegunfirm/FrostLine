/**
 * Quick Restore - Smaller batches for reliability
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

async function quickRestore() {
  try {
    console.log('🚀 Quick restore starting...');
    
    // Read backup
    const backupPath = join(process.cwd(), 'backups', 'algolia-browse-backup-2025-07-08T21-30-51-470Z.json');
    const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
    
    console.log(`📊 Backup contains ${backupData.totalProducts} products`);
    
    // Check current count
    const currentResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
      { hitsPerPage: 1 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`📋 Current products: ${currentResponse.data.nbHits}`);
    
    // Use smaller batches for reliability
    const batchSize = 50;
    const products = backupData.backup;
    let totalRestored = 0;
    let successfulBatches = 0;
    let errorCount = 0;
    
    console.log(`🔄 Restoring ${products.length} products in batches of ${batchSize}...`);
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      try {
        const response = await axios.post(
          `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/batch`,
          {
            requests: batch.map(product => ({
              action: 'addObject',
              body: product
            }))
          },
          {
            headers: {
              'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
              'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        totalRestored += batch.length;
        successfulBatches++;
        
        if (totalRestored % 1000 === 0 || i + batchSize >= products.length) {
          const progress = ((totalRestored / products.length) * 100).toFixed(1);
          console.log(`✅ Restored ${totalRestored}/${products.length} products (${progress}%) - ${successfulBatches} successful batches`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`);
        
        if (errorCount > 5) {
          console.log('⚠️ Too many errors, stopping restore');
          break;
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🏁 Restore process completed`);
    console.log(`✅ Total restored: ${totalRestored} products`);
    console.log(`🎯 Successful batches: ${successfulBatches}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final verification
    const finalResponse = await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
      { hitsPerPage: 1 },
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`🏆 Final count: ${finalResponse.data.nbHits} products`);
    
  } catch (error) {
    console.error('💥 Restore failed:', error.message);
  }
}

quickRestore();