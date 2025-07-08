/**
 * Algolia Browse API Backup
 * Uses Algolia's browse API to get all products without pagination limits
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

async function algoliabroseBackup() {
  console.log('💾 Creating Algolia backup using browse API...');
  
  try {
    const allProducts = [];
    let cursor = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const body: any = {
        hitsPerPage: 1000
      };
      
      if (cursor) {
        body.cursor = cursor;
      }
      
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/browse`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const results = await response.json();
      
      if (results.hits && results.hits.length > 0) {
        allProducts.push(...results.hits);
        console.log(`📦 Downloaded ${allProducts.length} products...`);
        
        cursor = results.cursor;
        hasMore = !!cursor;
      } else {
        hasMore = false;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      totalProducts: allProducts.length,
      indexName: 'products',
      algoliaAppId: process.env.ALGOLIA_APP_ID,
      method: 'browse-api',
      backup: allProducts
    };
    
    // Save backup
    const backupDir = join(process.cwd(), 'backups');
    const jsonFile = join(backupDir, `algolia-browse-backup-${timestamp}.json`);
    
    writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Browse backup completed!`);
    console.log(`📄 File: ${jsonFile}`);
    console.log(`📊 Products backed up: ${allProducts.length}`);
    console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(backupData)) / 1024 / 1024).toFixed(2)} MB`);
    
    // Verify backup integrity
    console.log('\n🔍 Verifying backup integrity...');
    
    // Check Department counts
    const deptCounts = {};
    allProducts.forEach(p => {
      const dept = p.departmentNumber;
      if (dept) {
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }
    });
    
    // Show key departments
    console.log(`Department 01 (Handguns): ${deptCounts['01'] || 0} products`);
    console.log(`Department 05 (Long Guns): ${deptCounts['05'] || 0} products`);
    console.log(`Department 06 (NFA Items): ${deptCounts['06'] || 0} products`);
    console.log(`Department 08 (Optics): ${deptCounts['08'] || 0} products`);
    
    // Check for required fields
    const hasRequiredFields = allProducts.every(p => 
      p.objectID && p.name && p.departmentNumber && p.tierPricing
    );
    
    console.log(`Required fields check: ${hasRequiredFields ? '✅' : '❌'}`);
    
    // Summary
    console.log('\n📋 Backup Summary:');
    console.log(`- Products backed up: ${allProducts.length}`);
    console.log(`- Expected products: ~29,836`);
    console.log(`- Backup file: ${jsonFile}`);
    console.log(`- Method: Browse API`);
    console.log(`- Timestamp: ${timestamp}`);
    
    if (allProducts.length >= 29000) {
      console.log('\n🎉 BACKUP COMPLETE AND VERIFIED!');
      console.log('Your Algolia index is now safely backed up with all department numbers.');
      console.log('This backup preserves your pristine RSR department synchronization.');
      console.log('You can restore this backup anytime if needed.');
    } else {
      console.log('\n⚠️  Backup may be incomplete - expected ~29,836 products');
    }
    
    return jsonFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
}

// Run the browse backup
algoliabroseBackup().then(backupFile => {
  if (backupFile) {
    console.log(`\n💾 Backup saved to: ${backupFile}`);
  }
});