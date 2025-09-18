/**
 * Category Backfill Script - Execute categorization fixes
 * 
 * This script applies the category rules to fix product categorization issues.
 * It creates backups, logs all changes, and can be run in batches for safety.
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { analyzeCategorizationChanges, type ProductData, type CategoryChange } from './category-rules-engine';
import * as fs from 'fs';
import * as path from 'path';

interface BackfillOptions {
  batchSize: number;
  dryRun: boolean;
  maxProducts?: number;
  backupDirectory: string;
}

interface BackfillResults {
  totalProcessed: number;
  totalChanged: number;
  changesByCategory: Record<string, number>;
  backupFiles: string[];
  errors: Array<{ productId: number; error: string }>;
}

function createBackupDirectory(baseDir: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const fullPath = path.join(baseDir, `category-backfill-${timestamp}`);
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  
  return fullPath;
}

async function createBackupFiles(changes: CategoryChange[], backupDir: string): Promise<string[]> {
  const backupFiles: string[] = [];
  
  // Create main backup file with all changes
  const mainBackupFile = path.join(backupDir, 'category-changes-backup.csv');
  const csvHeader = 'product_id,sku,name,old_category,new_category,reason,timestamp\n';
  const csvRows = changes.map(change => {
    const cleanName = change.name.replace(/[",\n\r]/g, ' ').substring(0, 100);
    const cleanReason = change.reason.replace(/[",\n\r]/g, ' ');
    return `${change.productId},"${change.sku}","${cleanName}","${change.fromCategory}","${change.toCategory}","${cleanReason}","${new Date().toISOString()}"`;
  }).join('\n');
  
  fs.writeFileSync(mainBackupFile, csvHeader + csvRows);
  backupFiles.push(mainBackupFile);
  
  // Create category-specific backup files for easier analysis
  const byCategory = changes.reduce((acc, change) => {
    if (!acc[change.toCategory]) acc[change.toCategory] = [];
    acc[change.toCategory].push(change);
    return acc;
  }, {} as Record<string, CategoryChange[]>);
  
  for (const [category, categoryChanges] of Object.entries(byCategory)) {
    const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
    const categoryFile = path.join(backupDir, `changes-to-${safeCategory}.csv`);
    const categoryRows = categoryChanges.map(change => {
      const cleanName = change.name.replace(/[",\n\r]/g, ' ').substring(0, 100);
      const cleanReason = change.reason.replace(/[",\n\r]/g, ' ');
      return `${change.productId},"${change.sku}","${cleanName}","${change.fromCategory}","${cleanReason}"`;
    }).join('\n');
    
    fs.writeFileSync(categoryFile, 'product_id,sku,name,old_category,reason\n' + categoryRows);
    backupFiles.push(categoryFile);
  }
  
  return backupFiles;
}

async function applyBatchChanges(changes: CategoryChange[], dryRun: boolean = false): Promise<void> {
  if (changes.length === 0) return;
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Applying ${changes.length} changes...`);
  
  if (dryRun) {
    // Just log what would be done
    const summary = changes.reduce((acc, change) => {
      if (!acc[change.toCategory]) acc[change.toCategory] = 0;
      acc[change.toCategory]++;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Would change:');
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`      → ${category}: ${count} products`);
    });
    return;
  }
  
  // Apply changes in database
  const productIds = changes.map(c => c.productId);
  const changeMap = new Map(changes.map(c => [c.productId, c.toCategory]));
  
  // Build CASE statement for bulk update
  const caseStatements = changes.map((change, index) => 
    `WHEN ${change.productId} THEN '${change.toCategory.replace(/'/g, "''")}'`
  ).join(' ');
  
  const updateQuery = `
    UPDATE products 
    SET category = CASE id 
      ${caseStatements}
      ELSE category 
    END
    WHERE id IN (${productIds.join(',')})
  `;
  
  try {
    await db.execute(sql.raw(updateQuery));
    
    const summary = changes.reduce((acc, change) => {
      if (!acc[change.toCategory]) acc[change.toCategory] = 0;
      acc[change.toCategory]++;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   ✅ Successfully updated:');
    Object.entries(summary).forEach(([category, count]) => {
      console.log(`      → ${category}: ${count} products`);
    });
    
  } catch (error) {
    console.error('   ❌ Batch update failed:', error);
    throw error;
  }
}

async function executeBackfill(options: BackfillOptions): Promise<BackfillResults> {
  console.log('🚀 Starting category backfill process...\n');
  console.log(`Options: ${JSON.stringify(options, null, 2)}\n`);
  
  const results: BackfillResults = {
    totalProcessed: 0,
    totalChanged: 0,
    changesByCategory: {},
    backupFiles: [],
    errors: []
  };
  
  // Create backup directory
  const backupDir = createBackupDirectory(options.backupDirectory);
  console.log(`📁 Backup directory created: ${backupDir}\n`);
  
  // Get all products that need analysis
  console.log('📊 Fetching products from database...');
  let query = db.select({
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
  
  if (options.maxProducts) {
    query = query.limit(options.maxProducts);
  }
  
  const allProducts = await query;
  console.log(`📈 Found ${allProducts.length} products to analyze\n`);
  
  // Analyze what changes need to be made
  console.log('🔬 Analyzing categorization...');
  const analysis = analyzeCategorizationChanges(allProducts);
  console.log(`✅ Analysis complete: ${analysis.totalChanges} changes needed\n`);
  
  if (analysis.totalChanges === 0) {
    console.log('✅ No changes needed - categories are already correct!\n');
    return results;
  }
  
  // Create backup files
  console.log('💾 Creating backup files...');
  results.backupFiles = await createBackupFiles(analysis.changes, backupDir);
  console.log(`✅ Created ${results.backupFiles.length} backup files\n`);
  
  // Log summary before applying changes
  console.log('📋 CHANGES SUMMARY');
  console.log('-'.repeat(30));
  const changeSummary = analysis.changes.reduce((acc, change) => {
    if (!acc[change.toCategory]) acc[change.toCategory] = {};
    if (!acc[change.toCategory][change.fromCategory]) acc[change.toCategory][change.fromCategory] = 0;
    acc[change.toCategory][change.fromCategory]++;
    return acc;
  }, {} as Record<string, Record<string, number>>);
  
  Object.entries(changeSummary).forEach(([toCategory, fromCategories]) => {
    const total = Object.values(fromCategories).reduce((sum, count) => sum + count, 0);
    console.log(`${toCategory}: ${total} products`);
    Object.entries(fromCategories).forEach(([fromCategory, count]) => {
      console.log(`   From ${fromCategory}: ${count}`);
    });
  });
  console.log();
  
  // Apply changes in batches
  console.log(`🔄 Applying changes in batches of ${options.batchSize}...`);
  const changes = analysis.changes;
  const batches = [];
  
  for (let i = 0; i < changes.length; i += options.batchSize) {
    batches.push(changes.slice(i, i + options.batchSize));
  }
  
  console.log(`📦 Processing ${batches.length} batches...\n`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Batch ${i + 1}/${batches.length}: ${batch.length} products`);
    
    try {
      await applyBatchChanges(batch, options.dryRun);
      
      results.totalChanged += batch.length;
      batch.forEach(change => {
        results.changesByCategory[change.toCategory] = 
          (results.changesByCategory[change.toCategory] || 0) + 1;
      });
      
      // Small delay between batches for database breathing room
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error);
      batch.forEach(change => {
        results.errors.push({
          productId: change.productId,
          error: String(error)
        });
      });
    }
  }
  
  results.totalProcessed = allProducts.length;
  
  // Save final results
  const resultsFile = path.join(backupDir, 'backfill-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    options,
    results,
    changesSummary: changeSummary
  }, null, 2));
  
  results.backupFiles.push(resultsFile);
  
  console.log('\n🎉 BACKFILL COMPLETE!');
  console.log('-'.repeat(30));
  console.log(`Total processed: ${results.totalProcessed.toLocaleString()}`);
  console.log(`Total changed: ${results.totalChanged.toLocaleString()}`);
  console.log(`Success rate: ${((results.totalChanged / analysis.totalChanges) * 100).toFixed(1)}%`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Backup files: ${results.backupFiles.length}`);
  console.log(`Backup directory: ${backupDir}\n`);
  
  if (!options.dryRun && results.totalChanged > 0) {
    console.log('⚠️  IMPORTANT: You should now run the Algolia reindex to update search results!');
  }
  
  return results;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dry');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '500');
  const maxProducts = args.find(arg => arg.startsWith('--max-products='))?.split('=')[1];
  
  const options: BackfillOptions = {
    batchSize,
    dryRun,
    maxProducts: maxProducts ? parseInt(maxProducts) : undefined,
    backupDirectory: './backups'
  };
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No database changes will be made\n');
  } else {
    console.log('⚠️  LIVE MODE - Database changes will be applied!\n');
  }
  
  try {
    await executeBackfill(options);
  } catch (error) {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main();