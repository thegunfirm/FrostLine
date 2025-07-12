/**
 * Restore Algolia Index from Backup
 * Restores the full 29,836 product catalog from the backup file
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

async function restoreFromBackup() {
  try {
    console.log('📦 Restoring Algolia index from backup...');
    
    // Read the backup file
    const backupPath = join(process.cwd(), 'backups', 'algolia-browse-backup-2025-07-08T21-30-51-470Z.json');
    const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
    
    console.log(`📊 Backup contains ${backupData.totalProducts} products`);
    console.log(`🕐 Backup timestamp: ${backupData.timestamp}`);
    
    // First, clear the current index
    console.log('🧹 Clearing current index...');
    await axios.post(
      `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/clear`,
      {},
      {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Wait for clear to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Restore products in batches
    const batchSize = 100;
    const products = backupData.backup;
    let totalRestored = 0;
    
    console.log(`🔄 Restoring ${products.length} products...`);
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
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
          }
        }
      );
      
      totalRestored += batch.length;
      const progress = ((totalRestored / products.length) * 100).toFixed(1);
      console.log(`📈 Restored ${totalRestored}/${products.length} products (${progress}%)`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('✅ Restore completed');
    
    // Wait for indexing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify restore
    const verifyResponse = await axios.post(
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
    
    console.log(`🏆 Final product count: ${verifyResponse.data.nbHits}`);
    
    // Test searches
    const testCategories = [
      { name: 'Handguns', dept: '01' },
      { name: 'Long Guns', dept: '05' },
      { name: 'Ammunition', dept: '18' }
    ];
    
    for (const category of testCategories) {
      const testResponse = await axios.post(
        `https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/search`,
        {
          query: '',
          filters: `departmentNumber:"${category.dept}"`,
          hitsPerPage: 3
        },
        {
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`🎯 ${category.name} search: ${testResponse.data.nbHits} results`);
    }
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

restoreFromBackup();