#!/usr/bin/env tsx

/**
 * Backfill Script: Fix Product Categorization and Gold Pricing
 * 
 * This script fixes two issues:
 * 1. Products with wrong categories due to department number mapping issues
 * 2. Products with incorrect Gold pricing (should be (MSRP + Dealer)/2, not MAP)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNotNull, or, inArray } from 'drizzle-orm';
import { products } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// Department to category mapping (matching the fixed logic)
function mapDepartmentToCategory(departmentNumber: string): string {
  // Normalize department number by removing leading zeros
  const normalizedDept = departmentNumber.replace(/^0+/, '') || '0';
  
  const categoryMap: Record<string, string> = {
    '1': 'Handguns',
    '2': 'Used Handguns',
    '3': 'Used Long Guns',
    '4': 'Tasers',
    '5': 'Long Guns',
    '6': 'NFA Products',
    '7': 'Black Powder',
    '8': 'Optics',
    '9': 'Optical Accessories',
    '10': 'Magazines',
    '11': 'Grips, Pads, Stocks, Bipods',
    '12': 'Soft Gun Cases, Packs, Bags',
    '13': 'Misc. Accessories',
    '14': 'Holsters & Pouches',
    '15': 'Reloading Equipment',
    '16': 'Black Powder Accessories',
    '17': 'Closeout Accessories',
    '18': 'Ammunition',
    '19': 'Survival & Camping Supplies',
    '20': 'Lights, Lasers & Batteries',
    '21': 'Cleaning Equipment',
    '22': 'Airguns',
    '23': 'Knives & Tools',
    '24': 'High Capacity Magazines',
    '25': 'Safes & Security',
    '26': 'Safety & Protection',
    '27': 'Non-Lethal Defense',
    '28': 'Binoculars',
    '29': 'Spotting Scopes',
    '30': 'Sights',
    '31': 'Optical Accessories',
    '32': 'Barrels, Choke Tubes & Muzzle Devices',
    '33': 'Clothing',
    '34': 'Parts',
    '35': 'Slings & Swivels',
    '36': 'Electronics',
    '38': 'Books, Software & DVDs',
    '39': 'Targets',
    '40': 'Hard Gun Cases',
    '41': 'Upper Receivers & Conversion Kits',
    '42': 'SBR Barrels & Upper Receivers',
    '43': 'Upper Receivers & Conversion Kits - High Capacity'
  };

  return categoryMap[normalizedDept] || 'Accessories';
}

function requiresFFL(departmentNumber: string): boolean {
  // Normalize department number by removing leading zeros
  const normalizedDept = departmentNumber.replace(/^0+/, '') || '0';
  const fflRequiredDepartments = ['1', '2', '3', '5', '6', '7', '41', '42', '43'];
  return fflRequiredDepartments.includes(normalizedDept);
}

function calculateGoldPrice(msrp: string, wholesale: string): string {
  const msrpNum = parseFloat(msrp) || 0;
  const wholesaleNum = parseFloat(wholesale) || 0;
  
  if (msrpNum === 0 && wholesaleNum === 0) {
    return "0";
  }
  
  // Gold = (MSRP + Dealer)/2
  const goldPrice = (msrpNum + wholesaleNum) / 2;
  return goldPrice.toFixed(2);
}

async function main() {
  console.log('🔧 Starting categorization and pricing fix...\n');

  try {
    // Step 1: Find products with wrong categories
    console.log('📊 Analyzing products with potential categorization issues...');
    
    const allProducts = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      category: products.category,
      departmentNumber: products.departmentNumber,
      requiresFFL: products.requiresFFL,
      priceMSRP: products.priceMSRP,
      priceWholesale: products.priceWholesale,
      priceGold: products.priceGold
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        isNotNull(products.departmentNumber)
      )
    );

    console.log(`📈 Found ${allProducts.length} active products with department numbers`);

    // Analyze categorization issues
    let categorizationFixes = 0;
    let pricingFixes = 0;
    let fflFixes = 0;

    const updates: Array<{
      id: number;
      sku: string;
      name: string;
      currentCategory: string;
      correctCategory: string;
      currentFFL: boolean;
      correctFFL: boolean;
      currentGold: string;
      correctGold: string;
      needsCategoryFix: boolean;
      needsFFLFix: boolean;
      needsPricingFix: boolean;
    }> = [];

    for (const product of allProducts) {
      const correctCategory = mapDepartmentToCategory(product.departmentNumber!);
      const correctFFL = requiresFFL(product.departmentNumber!);
      const correctGold = calculateGoldPrice(product.priceMSRP || "0", product.priceWholesale || "0");

      const needsCategoryFix = product.category !== correctCategory;
      const needsFFLFix = product.requiresFFL !== correctFFL;
      const needsPricingFix = Math.abs(parseFloat(product.priceGold || "0") - parseFloat(correctGold)) > 0.01;

      if (needsCategoryFix || needsFFLFix || needsPricingFix) {
        updates.push({
          id: product.id,
          sku: product.sku!,
          name: product.name,
          currentCategory: product.category!,
          correctCategory,
          currentFFL: product.requiresFFL || false,
          correctFFL,
          currentGold: product.priceGold || "0",
          correctGold,
          needsCategoryFix,
          needsFFLFix,
          needsPricingFix
        });

        if (needsCategoryFix) categorizationFixes++;
        if (needsFFLFix) fflFixes++;
        if (needsPricingFix) pricingFixes++;
      }
    }

    console.log(`\n📋 Analysis Results:`);
    console.log(`   • Products needing category fix: ${categorizationFixes}`);
    console.log(`   • Products needing FFL fix: ${fflFixes}`);
    console.log(`   • Products needing pricing fix: ${pricingFixes}`);
    console.log(`   • Total products to update: ${updates.length}\n`);

    if (updates.length === 0) {
      console.log('✅ No fixes needed! All products are correctly categorized and priced.');
      return;
    }

    // Show examples of fixes
    console.log('📝 Examples of fixes needed:');
    updates.slice(0, 5).forEach(update => {
      console.log(`   ${update.sku} - ${update.name.substring(0, 50)}...`);
      if (update.needsCategoryFix) {
        console.log(`     Category: ${update.currentCategory} → ${update.correctCategory}`);
      }
      if (update.needsFFLFix) {
        console.log(`     FFL Required: ${update.currentFFL} → ${update.correctFFL}`);
      }
      if (update.needsPricingFix) {
        console.log(`     Gold Price: $${update.currentGold} → $${update.correctGold}`);
      }
      console.log('');
    });

    // Apply fixes
    console.log('🔄 Applying fixes...');
    let processed = 0;

    for (const update of updates) {
      const updateData: any = {};

      if (update.needsCategoryFix) {
        updateData.category = update.correctCategory;
      }
      if (update.needsFFLFix) {
        updateData.requiresFFL = update.correctFFL;
      }
      if (update.needsPricingFix) {
        updateData.priceGold = update.correctGold;
      }

      await db.update(products)
        .set(updateData)
        .where(eq(products.id, update.id));

      processed++;
      if (processed % 100 === 0) {
        console.log(`   ✅ Updated ${processed}/${updates.length} products...`);
      }
    }

    console.log(`\n✅ Fix completed successfully!`);
    console.log(`   • ${categorizationFixes} products recategorized`);
    console.log(`   • ${fflFixes} products FFL status corrected`);
    console.log(`   • ${pricingFixes} products Gold pricing corrected`);

    // Final verification
    console.log('\n🔍 Verification check...');
    const firearmCategories = ['Handguns', 'Used Handguns', 'Long Guns', 'Used Long Guns', 'NFA Products', 'Black Powder'];
    const misplacedFirearms = await db.select({
      count: products.id
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        eq(products.category, 'Accessories'),
        eq(products.requiresFFL, true)
      )
    );

    console.log(`   • Firearms still in Accessories: ${misplacedFirearms.length}`);
    if (misplacedFirearms.length === 0) {
      console.log('   ✅ No firearms found in Accessories category');
    }

    console.log('\n🎯 Backfill complete!');

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();