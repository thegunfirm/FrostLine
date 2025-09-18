/**
 * Dry-run analyzer for category fixes
 * 
 * This script analyzes products and reports what category changes would be made
 * without actually modifying the database. Provides detailed statistics and examples.
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, sql, and, or } from 'drizzle-orm';
import { analyzeCategorizationChanges, type ProductData } from './category-rules-engine';
import * as fs from 'fs';

interface AnalysisReport {
  totalProducts: number;
  totalChanges: number;
  changesByCategory: Record<string, {
    count: number;
    examples: Array<{ sku: string; name: string; from: string; reason: string }>;
    fromCategories: Record<string, number>;
  }>;
  currentCategoryCounts: Record<string, number>;
  projectedCategoryCounts: Record<string, number>;
}

async function analyzeCategorizationIssues(): Promise<AnalysisReport> {
  console.log('🔍 Starting category analysis...\n');
  
  // Get all products from database
  console.log('📊 Fetching products from database...');
  const allProducts = await db.select({
    id: products.id,
    name: products.name,
    sku: products.sku,
    category: products.category,
    department_number: products.departmentNumber,
    department_desc: products.departmentDesc,
    sub_department_desc: products.subDepartmentDesc,
    subcategory_name: products.subcategoryName,
    nfa_item_type: products.nfaItemType,
    receiver_type: products.receiverType,
    caliber: products.caliber,
    requires_ffl: products.requiresFFL,
    is_firearm: products.isFirearm,
    platform_category: products.platformCategory,
    manufacturer: products.manufacturer
  }).from(products);
  
  console.log(`📈 Found ${allProducts.length} products to analyze\n`);
  
  // Get current category counts
  const currentCounts = await db
    .select({
      category: products.category,
      count: sql<number>`count(*)`.as('count')
    })
    .from(products)
    .groupBy(products.category)
    .orderBy(sql`count(*) DESC`);
  
  const currentCategoryCounts: Record<string, number> = {};
  for (const row of currentCounts) {
    currentCategoryCounts[row.category] = Number(row.count);
  }
  
  console.log('📊 Current category distribution:');
  Object.entries(currentCategoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)  // Show top 15
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count.toLocaleString()}`);
    });
  console.log('   ...\n');
  
  // Analyze what changes would be made
  console.log('🔬 Analyzing categorization rules...');
  const analysis = analyzeCategorizationChanges(allProducts);
  
  console.log(`✅ Analysis complete: ${analysis.totalChanges.toLocaleString()} changes identified\n`);
  
  // Group changes by target category
  const changesByCategory: Record<string, {
    count: number;
    examples: Array<{ sku: string; name: string; from: string; reason: string }>;
    fromCategories: Record<string, number>;
  }> = {};
  
  for (const change of analysis.changes) {
    if (!changesByCategory[change.toCategory]) {
      changesByCategory[change.toCategory] = {
        count: 0,
        examples: [],
        fromCategories: {}
      };
    }
    
    const categoryData = changesByCategory[change.toCategory];
    categoryData.count++;
    
    // Track source categories
    categoryData.fromCategories[change.fromCategory] = 
      (categoryData.fromCategories[change.fromCategory] || 0) + 1;
    
    // Add examples (max 10 per category)
    if (categoryData.examples.length < 10) {
      categoryData.examples.push({
        sku: change.sku,
        name: change.name.substring(0, 80) + (change.name.length > 80 ? '...' : ''),
        from: change.fromCategory,
        reason: change.reason
      });
    }
  }
  
  // Calculate projected counts
  const projectedCategoryCounts = { ...currentCategoryCounts };
  for (const change of analysis.changes) {
    projectedCategoryCounts[change.fromCategory] = 
      (projectedCategoryCounts[change.fromCategory] || 0) - 1;
    projectedCategoryCounts[change.toCategory] = 
      (projectedCategoryCounts[change.toCategory] || 0) + 1;
  }
  
  // Remove categories that would have 0 products
  Object.keys(projectedCategoryCounts).forEach(key => {
    if (projectedCategoryCounts[key] <= 0) {
      delete projectedCategoryCounts[key];
    }
  });
  
  return {
    totalProducts: allProducts.length,
    totalChanges: analysis.totalChanges,
    changesByCategory,
    currentCategoryCounts,
    projectedCategoryCounts
  };
}

function printAnalysisReport(report: AnalysisReport): void {
  console.log('📋 CATEGORY ANALYSIS REPORT');
  console.log('=' .repeat(50));
  console.log(`Total Products: ${report.totalProducts.toLocaleString()}`);
  console.log(`Total Changes: ${report.totalChanges.toLocaleString()} (${(report.totalChanges / report.totalProducts * 100).toFixed(1)}%)\n`);
  
  if (report.totalChanges === 0) {
    console.log('✅ No categorization issues found!\n');
    return;
  }
  
  console.log('🔄 CHANGES BY TARGET CATEGORY');
  console.log('-'.repeat(30));
  
  // Sort by change count descending
  const sortedChanges = Object.entries(report.changesByCategory)
    .sort(([,a], [,b]) => b.count - a.count);
  
  for (const [category, data] of sortedChanges) {
    console.log(`\n📂 ${category} (${data.count.toLocaleString()} products)`);
    
    // Show source categories
    const sortedSources = Object.entries(data.fromCategories)
      .sort(([,a], [,b]) => b - a);
    console.log('   Source categories:');
    for (const [source, count] of sortedSources) {
      console.log(`      ${source}: ${count.toLocaleString()}`);
    }
    
    // Show examples
    console.log('   Examples:');
    for (const example of data.examples.slice(0, 5)) {
      console.log(`      ${example.sku}: ${example.name}`);
      console.log(`         From: ${example.from} → Reason: ${example.reason}`);
    }
    if (data.examples.length > 5) {
      console.log(`      ... and ${data.examples.length - 5} more`);
    }
  }
  
  console.log('\n📊 BEFORE vs AFTER COMPARISON');
  console.log('-'.repeat(30));
  
  // Focus on key categories
  const keyCategories = ['Rifles', 'Shotguns', 'Handguns', 'Long Guns', 'Accessories', 'NFA Products'];
  
  for (const category of keyCategories) {
    const before = report.currentCategoryCounts[category] || 0;
    const after = report.projectedCategoryCounts[category] || 0;
    const change = after - before;
    const changeStr = change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
    
    console.log(`${category.padEnd(15)}: ${before.toLocaleString().padStart(6)} → ${after.toLocaleString().padStart(6)} (${changeStr})`);
  }
}

async function saveAnalysisToFile(report: AnalysisReport): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `category-analysis-${timestamp}.json`;
  
  const reportData = {
    timestamp: new Date().toISOString(),
    ...report,
    // Add detailed change list for debugging
    allChanges: Object.values(report.changesByCategory).reduce((acc, category) => {
      return acc + category.count;
    }, 0)
  };
  
  fs.writeFileSync(filename, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Full analysis saved to: ${filename}`);
}

// Run the analysis
async function main() {
  try {
    const report = await analyzeCategorizationIssues();
    printAnalysisReport(report);
    await saveAnalysisToFile(report);
    
    console.log('\n🎯 SUMMARY');
    console.log('-'.repeat(20));
    
    if (report.totalChanges > 0) {
      const riflesBefore = report.currentCategoryCounts['Rifles'] || 0;
      const riflesAfter = report.projectedCategoryCounts['Rifles'] || 0;
      const shotgunsBefore = report.currentCategoryCounts['Shotguns'] || 0;
      const shotgunsAfter = report.projectedCategoryCounts['Shotguns'] || 0;
      const longGunsBefore = report.currentCategoryCounts['Long Guns'] || 0;
      const longGunsAfter = report.projectedCategoryCounts['Long Guns'] || 0;
      
      console.log(`Key fixes:`);
      console.log(`• Rifles: ${riflesBefore} → ${riflesAfter} (+${riflesAfter - riflesBefore})`);
      console.log(`• Shotguns: ${shotgunsBefore} → ${shotgunsAfter} (+${shotgunsAfter - shotgunsBefore})`);
      console.log(`• Long Guns: ${longGunsBefore} → ${longGunsAfter} (${longGunsAfter - longGunsBefore})`);
      
      console.log(`\n✅ Ready to execute fixes with backfill script`);
    } else {
      console.log('✅ No categorization issues detected');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main();