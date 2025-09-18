/**
 * Execute Category Cleanup
 * Moves misplaced products to their proper categories
 * Fixes FFL requirements based on actual product type
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeCategories, isActualFirearm, determineCorrectCategory } from './strict-category-cleanup';

interface CleanupResult {
  productId: number;
  sku: string;
  name: string;
  fromCategory: string;
  toCategory: string;
  fflBefore: boolean;
  fflAfter: boolean;
  status: 'success' | 'error';
  errorMessage?: string;
}

async function executeCleanup(dryRun: boolean = false) {
  console.log(`\n🚀 ${dryRun ? 'DRY RUN - ' : ''}Starting Category Cleanup...\n`);
  
  const results: CleanupResult[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    // First, create backup table if executing for real
    if (!dryRun) {
      console.log('📦 Creating backup of current categorization...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS category_cleanup_backup_${sql.raw(timestamp.split('T')[0].replace(/-/g, ''))} AS 
        SELECT id, sku, name, category, requires_ffl, must_route_through_gun_firm, created_at 
        FROM products 
        WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
      `);
      console.log('✅ Backup created\n');
    }
    
    // Get all products from firearm categories
    const products = await db.execute(sql`
      SELECT 
        id, sku, name, description, manufacturer, category, 
        requires_ffl, must_route_through_gun_firm, department_number, subcategory_name
      FROM products
      WHERE category IN ('Handguns', 'Rifles', 'Shotguns')
      ORDER BY category, name
    `);
    
    console.log(`📊 Processing ${products.rows.length} products...\n`);
    
    let processed = 0;
    let moved = 0;
    let fflFixed = 0;
    let errors = 0;
    
    // Group updates by target category for efficiency
    const updateBatches: Record<string, { ids: number[]; products: any[] }> = {};
    
    for (const product of products.rows) {
      processed++;
      
      const isFirearm = isActualFirearm(product);
      const currentCategory = product.category as string;
      const currentFFL = product.requires_ffl as boolean;
      
      // Determine correct category and FFL status
      let newCategory = currentCategory;
      let newFFL = currentFFL;
      let needsUpdate = false;
      
      if (!isFirearm) {
        // Not a firearm - move to appropriate category
        newCategory = determineCorrectCategory(product);
        
        // Only actual firearms and NFA items require FFL
        if (newCategory === 'NFA Products') {
          newFFL = true;
        } else if (newCategory === 'Uppers/Lowers' && /\blower\s*(receiver|assembly)\b/i.test(product.name as string)) {
          // Serialized lower receivers require FFL
          newFFL = true;
        } else {
          // Accessories, parts, ammo, etc. do NOT require FFL
          newFFL = false;
        }
        
        needsUpdate = true;
      } else {
        // It IS a firearm - ensure FFL is set correctly
        if (!currentFFL) {
          newFFL = true;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        // Add to batch for update
        if (!updateBatches[newCategory]) {
          updateBatches[newCategory] = { ids: [], products: [] };
        }
        updateBatches[newCategory].ids.push(product.id as number);
        updateBatches[newCategory].products.push({
          ...product,
          newCategory,
          newFFL
        });
        
        const result: CleanupResult = {
          productId: product.id as number,
          sku: product.sku as string,
          name: product.name as string,
          fromCategory: currentCategory,
          toCategory: newCategory,
          fflBefore: currentFFL,
          fflAfter: newFFL,
          status: 'success'
        };
        
        results.push(result);
        
        if (currentCategory !== newCategory) moved++;
        if (currentFFL !== newFFL) fflFixed++;
      }
      
      // Progress indicator
      if (processed % 500 === 0) {
        console.log(`   Processed ${processed}/${products.rows.length} products...`);
      }
    }
    
    console.log('\n📋 Cleanup Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total Processed: ${processed}`);
    console.log(`  Products to Move: ${moved}`);
    console.log(`  FFL Status to Fix: ${fflFixed}`);
    console.log(`  Total Changes: ${results.length}\n`);
    
    // Show breakdown by target category
    console.log('📦 Changes by Target Category:');
    console.log('─────────────────────────────────────────────────────');
    
    const categoryBreakdown: Record<string, number> = {};
    for (const result of results) {
      if (result.fromCategory !== result.toCategory) {
        categoryBreakdown[result.toCategory] = (categoryBreakdown[result.toCategory] || 0) + 1;
      }
    }
    
    for (const [category, count] of Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category}: ${count} products`);
    }
    
    // Execute updates if not dry run
    if (!dryRun) {
      console.log('\n🔄 Executing database updates...\n');
      
      for (const [targetCategory, batch] of Object.entries(updateBatches)) {
        if (batch.ids.length === 0) continue;
        
        console.log(`  Updating ${batch.ids.length} products to ${targetCategory}...`);
        
        // Update in batches of 100 for efficiency
        const batchSize = 100;
        for (let i = 0; i < batch.ids.length; i += batchSize) {
          const batchIds = batch.ids.slice(i, i + batchSize);
          const batchProducts = batch.products.slice(i, i + batchSize);
          
          // Get the common FFL status for this batch
          const firstProduct = batchProducts[0];
          const newFFL = firstProduct.newFFL;
          const routeThroughGunFirm = newFFL; // Route through GunFirm if FFL required
          
          try {
            // Update each product individually to avoid array issues
            let updatedInBatch = 0;
            for (const productId of batchIds) {
              await db.execute(sql`
                UPDATE products 
                SET 
                  category = ${targetCategory},
                  requires_ffl = ${newFFL},
                  must_route_through_gun_firm = ${routeThroughGunFirm}
                WHERE id = ${productId}
              `);
              updatedInBatch++;
              
              // Show progress every 10 products
              if (updatedInBatch % 10 === 0) {
                process.stdout.write(`    → ${updatedInBatch}/${batchIds.length}\r`);
              }
            }
            console.log(`    → ${updatedInBatch}/${batchIds.length} ✓`);
          } catch (error) {
            console.error(`❌ Error updating batch:`, error);
            errors++;
            
            // Mark these as errors in results
            for (const id of batchIds) {
              const result = results.find(r => r.productId === id);
              if (result) {
                result.status = 'error';
                result.errorMessage = String(error);
              }
            }
          }
        }
      }
      
      console.log('\n✅ Database updates complete!');
    } else {
      console.log('\n⚠️  DRY RUN - No database changes made');
    }
    
    // Save results to CSV
    const csvPath = path.join(process.cwd(), `category-cleanup-${dryRun ? 'dryrun-' : ''}${timestamp}.csv`);
    
    const csvContent = [
      'Product ID,SKU,Name,From Category,To Category,FFL Before,FFL After,Status,Error',
      ...results.map(r => 
        `"${r.productId}","${r.sku}","${r.name.replace(/"/g, '""')}","${r.fromCategory}","${r.toCategory}","${r.fflBefore}","${r.fflAfter}","${r.status}","${r.errorMessage || ''}"`
      )
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\n💾 Results saved to: ${csvPath}`);
    
    // Final summary
    console.log('\n\n🎯 Final Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Successful Updates: ${results.filter(r => r.status === 'success').length}`);
    if (errors > 0) {
      console.log(`  ❌ Errors: ${errors}`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const isDryRun = process.argv.includes('--dry-run');
  
  executeCleanup(isDryRun).then((results) => {
    console.log(`\n✅ Cleanup ${isDryRun ? 'analysis' : 'execution'} complete!`);
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
}

export { executeCleanup };