/**
 * Continue Restore - Resume from where we left off
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

async function continueRestore() {
  try {
    console.log('🔄 Continuing restore process...');
    
    // Get current count
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
    
    const currentCount = currentResponse.data.nbHits;
    console.log(`📊 Current products: ${currentCount}`);
    
    if (currentCount >= 29000) {
      console.log('✅ Restore appears complete');
      return;
    }
    
    // Read backup
    const backupPath = join(process.cwd(), 'backups', 'algolia-browse-backup-2025-07-08T21-30-51-470Z.json');
    const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
    
    // Get existing IDs to avoid duplicates
    const existingIds = new Set();
    let cursor = null;
    
    do {
      const browseParams = {
        hitsPerPage: 1000,
        attributesToRetrieve: ['objectID']
      };
      
      if (cursor) {
        browseParams.cursor = cursor;
      }
      
      const browseResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/browse`,
        browseParams,
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      browseResponse.data.hits.forEach(hit => {
        existingIds.add(hit.objectID);
      });
      
      cursor = browseResponse.data.cursor;
      
    } while (cursor);
    
    console.log(`📋 Found ${existingIds.size} existing products`);
    
    // Filter out existing products
    const missingProducts = backupData.backup.filter(product => !existingIds.has(product.objectID));
    console.log(`🆕 Missing products: ${missingProducts.length}`);
    
    if (missingProducts.length === 0) {
      console.log('✅ No missing products found');
      return;
    }
    
    // Restore missing products with larger batches
    const batchSize = 200;
    let totalRestored = 0;
    
    for (let i = 0; i < missingProducts.length; i += batchSize) {
      const batch = missingProducts.slice(i, i + batchSize);
      
      try {
        await axios.post(
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
            timeout: 15000
          }
        );
        
        totalRestored += batch.length;
        const progress = ((totalRestored / missingProducts.length) * 100).toFixed(1);
        console.log(`✅ Added ${totalRestored}/${missingProducts.length} products (${progress}%)`);
        
      } catch (error) {
        console.log(`❌ Batch failed: ${error.message}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`🏁 Continue restore completed - added ${totalRestored} products`);
    
  } catch (error) {
    console.error('💥 Continue restore failed:', error.message);
  }
}

continueRestore();