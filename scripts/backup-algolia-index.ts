/**
 * Backup Algolia Index
 * Creates a complete backup of the current Algolia index with all 29,836 products
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

async function backupAlgoliaIndex() {
  console.log('💾 Creating Algolia index backup...');
  
  try {
    const allProducts = [];
    let page = 0;
    const hitsPerPage = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: '',
          hitsPerPage,
          page
        })
      });
      
      const results = await response.json();
      
      if (results.hits && results.hits.length > 0) {
        allProducts.push(...results.hits);
        console.log(`📦 Backed up ${allProducts.length} products...`);
        
        // Check if we have more pages
        hasMore = results.hits.length === hitsPerPage && allProducts.length < results.nbHits;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      totalProducts: allProducts.length,
      indexName: 'products',
      backup: allProducts
    };
    
    // Save to multiple formats
    const backupDir = join(process.cwd(), 'backups');
    const jsonFile = join(backupDir, `algolia-backup-${timestamp}.json`);
    
    // Create backup directory if it doesn't exist
    try {
      await import('fs').then(fs => fs.mkdirSync(backupDir, { recursive: true }));
    } catch (error) {
      // Directory might already exist
    }
    
    // Write backup file
    writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup completed successfully!`);
    console.log(`📄 File: ${jsonFile}`);
    console.log(`📊 Products backed up: ${allProducts.length}`);
    console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(backupData)) / 1024 / 1024).toFixed(2)} MB`);
    
    // Verify backup integrity
    console.log('\n🔍 Verifying backup integrity...');
    
    // Check Department 01 count
    const dept01Count = allProducts.filter(p => p.departmentNumber === '01').length;
    console.log(`Department 01 (Handguns): ${dept01Count} products`);
    
    // Check for required fields
    const hasRequiredFields = allProducts.every(p => 
      p.objectID && p.name && p.departmentNumber && p.tierPricing
    );
    
    if (hasRequiredFields) {
      console.log('✅ All products have required fields');
    } else {
      console.log('❌ Some products missing required fields');
    }
    
    // Summary
    console.log('\n📋 Backup Summary:');
    console.log(`- Total products: ${allProducts.length}`);
    console.log(`- Expected products: 29,836`);
    console.log(`- Backup file: ${jsonFile}`);
    console.log(`- Timestamp: ${timestamp}`);
    
    if (allProducts.length >= 29800) {
      console.log('🎉 Backup is complete and ready for restoration if needed!');
    } else {
      console.log('⚠️  Backup may be incomplete - expected ~29,836 products');
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
}

// Run the backup
backupAlgoliaIndex();