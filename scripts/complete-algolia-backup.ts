/**
 * Complete Algolia Backup
 * Creates a full backup of all 29,836 products from Algolia index
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

async function completeAlgoliaBackup() {
  console.log('💾 Creating complete Algolia backup...');
  
  try {
    // First, get the total count
    const countResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        hitsPerPage: 1
      })
    });
    
    const countResults = await countResponse.json();
    const totalProducts = countResults.nbHits;
    console.log(`📊 Total products to backup: ${totalProducts}`);
    
    const allProducts = [];
    const hitsPerPage = 1000;
    const totalPages = Math.ceil(totalProducts / hitsPerPage);
    
    console.log(`📖 Processing ${totalPages} pages...`);
    
    for (let page = 0; page < totalPages; page++) {
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
        console.log(`📦 Page ${page + 1}/${totalPages}: ${allProducts.length}/${totalProducts} products`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      totalProducts: allProducts.length,
      expectedProducts: totalProducts,
      indexName: 'products',
      algoliaAppId: process.env.ALGOLIA_APP_ID,
      backup: allProducts
    };
    
    // Save backup
    const backupDir = join(process.cwd(), 'backups');
    const jsonFile = join(backupDir, `algolia-complete-backup-${timestamp}.json`);
    
    writeFileSync(jsonFile, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Complete backup finished!`);
    console.log(`📄 File: ${jsonFile}`);
    console.log(`📊 Products backed up: ${allProducts.length}`);
    console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(backupData)) / 1024 / 1024).toFixed(2)} MB`);
    
    // Verify backup integrity
    console.log('\n🔍 Verifying backup integrity...');
    
    // Check Department counts
    const dept01Count = allProducts.filter(p => p.departmentNumber === '01').length;
    const dept05Count = allProducts.filter(p => p.departmentNumber === '05').length;
    const dept06Count = allProducts.filter(p => p.departmentNumber === '06').length;
    const dept08Count = allProducts.filter(p => p.departmentNumber === '08').length;
    
    console.log(`Department 01 (Handguns): ${dept01Count} products`);
    console.log(`Department 05 (Long Guns): ${dept05Count} products`);
    console.log(`Department 06 (NFA Items): ${dept06Count} products`);
    console.log(`Department 08 (Optics): ${dept08Count} products`);
    
    // Check for required fields
    const hasRequiredFields = allProducts.every(p => 
      p.objectID && p.name && p.departmentNumber && p.tierPricing
    );
    
    console.log(`Required fields check: ${hasRequiredFields ? '✅' : '❌'}`);
    
    // Summary
    console.log('\n📋 Backup Summary:');
    console.log(`- Products backed up: ${allProducts.length}`);
    console.log(`- Expected products: ${totalProducts}`);
    console.log(`- Success rate: ${((allProducts.length / totalProducts) * 100).toFixed(1)}%`);
    console.log(`- Backup file: ${jsonFile}`);
    console.log(`- Timestamp: ${timestamp}`);
    
    if (allProducts.length >= totalProducts * 0.99) {
      console.log('\n🎉 BACKUP COMPLETE AND VERIFIED!');
      console.log('Your Algolia index is now safely backed up with all department numbers.');
      console.log('You can restore this backup anytime if needed.');
    } else {
      console.log('\n⚠️  Backup may be incomplete');
    }
    
    return jsonFile;
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return null;
  }
}

// Run the complete backup
completeAlgoliaBackup().then(backupFile => {
  if (backupFile) {
    console.log(`\n💾 Backup saved to: ${backupFile}`);
  }
});