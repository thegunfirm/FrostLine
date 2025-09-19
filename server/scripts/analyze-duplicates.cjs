#!/usr/bin/env node

/**
 * RSR Duplicate Product Analysis Script
 * 
 * Analyzes the database for duplicate products with the same UPC code
 * and generates a comprehensive cleanup report.
 */

const { db } = require('../db.js');
const { products } = require('../../shared/schema.js');
const { sql, eq, isNotNull, and } = require('drizzle-orm');
const fs = require('fs');
const path = require('path');

async function analyzeProductDuplicates() {
  console.log('🔍 Starting RSR duplicate product analysis...\n');
  
  try {
    // 1. Find all products with duplicate UPC codes
    const duplicateQuery = sql`
      SELECT 
        upc_code,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at DESC, id DESC) as product_ids,
        ARRAY_AGG(sku ORDER BY created_at DESC, id DESC) as skus,
        ARRAY_AGG(name ORDER BY created_at DESC, id DESC) as names,
        ARRAY_AGG(created_at ORDER BY created_at DESC, id DESC) as created_dates,
        ARRAY_AGG(stock_quantity ORDER BY created_at DESC, id DESC) as quantities,
        ARRAY_AGG(price_gold ORDER BY created_at DESC, id DESC) as gold_prices
      FROM products 
      WHERE upc_code IS NOT NULL 
        AND upc_code != '' 
        AND is_active = true
      GROUP BY upc_code 
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, upc_code
    `;

    const duplicateGroups = await db.execute(duplicateQuery);
    
    console.log(`📊 Found ${duplicateGroups.length} UPC codes with duplicates\n`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate products found! Database is clean.');
      return;
    }

    let totalDuplicates = 0;
    let reportLines = [];
    
    // Report header
    reportLines.push('# RSR Duplicate Product Analysis Report');
    reportLines.push(`Generated: ${new Date().toISOString()}`);
    reportLines.push('');
    reportLines.push('## Summary');
    reportLines.push(`- **Duplicate UPC Groups**: ${duplicateGroups.length}`);
    
    // Calculate total duplicates
    duplicateGroups.forEach(group => {
      totalDuplicates += group.duplicate_count - 1; // -1 because we keep the canonical one
    });
    
    reportLines.push(`- **Total Duplicate Products**: ${totalDuplicates}`);
    reportLines.push(`- **Products to Archive**: ${totalDuplicates}`);
    reportLines.push('');
    reportLines.push('## Cleanup Strategy');
    reportLines.push('- **Canonical Selection**: Most recently created product (highest ID)');
    reportLines.push('- **Archive Method**: Set `is_active = false`, preserve data for audit');
    reportLines.push('- **Alias Preservation**: Maintain SKU aliases for all archived products');
    reportLines.push('');
    reportLines.push('## Detailed Analysis');
    reportLines.push('');

    // Detailed analysis for each duplicate group
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      const upcCode = group.upc_code;
      const count = group.duplicate_count;
      const productIds = group.product_ids;
      const skus = group.skus;
      const names = group.names;
      const createdDates = group.created_dates;
      const quantities = group.quantities;
      const goldPrices = group.gold_prices;
      
      console.log(`🎯 UPC ${upcCode}: ${count} duplicates`);
      
      reportLines.push(`### ${i + 1}. UPC: ${upcCode} (${count} products)`);
      reportLines.push('');
      reportLines.push('| Status | Product ID | SKU | Name | Created | Stock | Gold Price |');
      reportLines.push('|--------|------------|-----|------|---------|-------|-----------|');
      
      for (let j = 0; j < productIds.length; j++) {
        const status = j === 0 ? '**KEEP**' : '`ARCHIVE`';
        const productId = productIds[j];
        const sku = skus[j];
        const name = (names[j] || '').substring(0, 40) + '...';
        const created = new Date(createdDates[j]).toLocaleDateString();
        const stock = quantities[j] || 0;
        const price = goldPrices[j] || '0.00';
        
        reportLines.push(`| ${status} | ${productId} | ${sku} | ${name} | ${created} | ${stock} | $${price} |`);
        
        if (j === 0) {
          console.log(`  ✅ KEEP: ID ${productId}, SKU ${sku}`);
        } else {
          console.log(`  🗂️  ARCHIVE: ID ${productId}, SKU ${sku}`);
        }
      }
      
      reportLines.push('');
      console.log('');
    }
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'duplicate-analysis-report.md');
    fs.writeFileSync(reportPath, reportLines.join('\n'));
    
    console.log(`📋 Detailed report saved to: ${reportPath}`);
    console.log('');
    console.log('🎯 **CLEANUP SUMMARY**:');
    console.log(`   - ${duplicateGroups.length} UPC codes with duplicates`);
    console.log(`   - ${totalDuplicates} products to archive`);
    console.log(`   - Strategy: Keep most recently created, archive others`);
    console.log('');
    console.log('✅ Analysis complete! Ready for deduplication.');

    // Generate SQL cleanup script
    const cleanupLines = [];
    cleanupLines.push('-- RSR Duplicate Product Cleanup Script');
    cleanupLines.push(`-- Generated: ${new Date().toISOString()}`);
    cleanupLines.push('-- WARNING: Run in transaction and test first!');
    cleanupLines.push('');
    cleanupLines.push('BEGIN;');
    cleanupLines.push('');

    for (const group of duplicateGroups) {
      const productIds = group.product_ids;
      const upcCode = group.upc_code;
      
      // Archive all but the first (canonical) product
      for (let j = 1; j < productIds.length; j++) {
        cleanupLines.push(`-- Archive duplicate for UPC ${upcCode}`);
        cleanupLines.push(`UPDATE products SET is_active = false, stock_quantity = 0, in_stock = false WHERE id = ${productIds[j]};`);
      }
      cleanupLines.push('');
    }

    cleanupLines.push('-- Uncomment to commit changes:');
    cleanupLines.push('-- COMMIT;');
    cleanupLines.push('ROLLBACK; -- Remove this line when ready to commit');

    const cleanupPath = path.join(process.cwd(), 'cleanup-duplicates.sql');
    fs.writeFileSync(cleanupPath, cleanupLines.join('\n'));
    
    console.log(`🧹 SQL cleanup script saved to: ${cleanupPath}`);
    
  } catch (error) {
    console.error('❌ Error during duplicate analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeProductDuplicates().then(() => {
  console.log('🏁 Analysis complete!');
  process.exit(0);
}).catch(console.error);