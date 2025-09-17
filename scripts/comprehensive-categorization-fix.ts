#!/usr/bin/env tsx

/**
 * Comprehensive Categorization Fix
 * 
 * This script fixes categorization for ALL products, including those without department numbers
 * by using description-based categorization logic that matches the updated RSR processor
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNotNull, or, isNull } from 'drizzle-orm';
import { products } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// Department to category mapping (matching the fixed logic)
function mapDepartmentToCategory(departmentNumber: string, productDescription?: string): string {
  // If no department number, try to categorize by product description
  if (!departmentNumber || departmentNumber.trim() === '') {
    return categorizeByDescription(productDescription || '');
  }
  
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

function categorizeByDescription(description: string): string {
  const desc = description.toLowerCase();
  
  // NFA Items (highest priority)
  if (desc.includes('suppressor') || desc.includes('silencer') || 
      desc.includes('sbr') || desc.includes('short barrel') ||
      desc.includes('sbs') || desc.includes('short barreled shotgun') ||
      desc.includes('aow') || desc.includes('any other weapon') ||
      desc.includes('machine gun') || desc.includes('full auto')) {
    return 'NFA Products';
  }
  
  // Firearms
  if (desc.includes('pistol') || desc.includes('handgun') || 
      desc.includes('revolver') || desc.includes('1911') ||
      (desc.includes('9mm') && (desc.includes('gun') || desc.includes('firearm'))) ||
      (desc.includes('45acp') && (desc.includes('gun') || desc.includes('firearm'))) ||
      (desc.includes('40sw') && (desc.includes('gun') || desc.includes('firearm')))) {
    return 'Handguns';
  }
  
  if (desc.includes('rifle') || desc.includes('carbine') || 
      desc.includes('ar-15') || desc.includes('ar15') ||
      desc.includes('shotgun') || desc.includes('12ga') || desc.includes('20ga')) {
    return 'Long Guns';
  }
  
  // Ammunition
  if (desc.includes('rounds') || desc.includes('cartridge') ||
      desc.includes('ammo') || desc.includes('ammunition') ||
      (desc.includes('grain') && (desc.includes('fmj') || desc.includes('jhp') || desc.includes('ball'))) ||
      desc.includes('brass') && desc.includes('case')) {
    return 'Ammunition';
  }
  
  // Optics
  if (desc.includes('scope') || desc.includes('red dot') ||
      desc.includes('sight') || desc.includes('optic')) {
    return 'Optics';
  }
  
  // Magazines
  if (desc.includes('magazine') || desc.includes('mag ') ||
      (desc.includes('round') && desc.includes('capacity'))) {
    return 'Magazines';
  }
  
  // Default to Accessories for everything else
  return 'Accessories';
}

function requiresFFL(departmentNumber: string, category: string): boolean {
  // If we have department number, use that
  if (departmentNumber && departmentNumber.trim() !== '') {
    const normalizedDept = departmentNumber.replace(/^0+/, '') || '0';
    const fflRequiredDepartments = ['1', '2', '3', '5', '6', '7', '41', '42', '43'];
    return fflRequiredDepartments.includes(normalizedDept);
  }
  
  // Otherwise, determine by category
  const fflRequiredCategories = [
    'Handguns', 'Used Handguns', 'Long Guns', 'Used Long Guns', 
    'NFA Products', 'Black Powder', 'Upper Receivers & Conversion Kits',
    'SBR Barrels & Upper Receivers', 'Upper Receivers & Conversion Kits - High Capacity'
  ];
  
  return fflRequiredCategories.includes(category);
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
  console.log('🔧 Starting comprehensive categorization fix...\n');

  try {
    // Get ALL active products
    console.log('📊 Loading all active products...');
    
    const allProducts = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: products.category,
      departmentNumber: products.departmentNumber,
      requiresFFL: products.requiresFFL,
      priceMSRP: products.priceMSRP,
      priceWholesale: products.priceWholesale,
      priceGold: products.priceGold
    }).from(products)
    .where(eq(products.isActive, true));

    console.log(`📈 Found ${allProducts.length} active products`);

    // Analyze all products
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
      reason: string;
    }> = [];

    for (const product of allProducts) {
      const correctCategory = mapDepartmentToCategory(
        product.departmentNumber || '', 
        product.name + ' ' + (product.description || '')
      );
      const correctFFL = requiresFFL(product.departmentNumber || '', correctCategory);
      const correctGold = calculateGoldPrice(product.priceMSRP || "0", product.priceWholesale || "0");

      const needsCategoryFix = product.category !== correctCategory;
      const needsFFLFix = product.requiresFFL !== correctFFL;
      const needsPricingFix = Math.abs(parseFloat(product.priceGold || "0") - parseFloat(correctGold)) > 0.01;

      let reason = '';
      if (!product.departmentNumber || product.departmentNumber.trim() === '') {
        reason = 'Description-based';
      } else {
        reason = `Dept: ${product.departmentNumber}`;
      }

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
          needsPricingFix,
          reason
        });

        if (needsCategoryFix) categorizationFixes++;
        if (needsFFLFix) fflFixes++;
        if (needsPricingFix) pricingFixes++;
      }
    }

    console.log(`\n📋 Comprehensive Analysis Results:`);
    console.log(`   • Products needing category fix: ${categorizationFixes}`);
    console.log(`   • Products needing FFL fix: ${fflFixes}`);
    console.log(`   • Products needing pricing fix: ${pricingFixes}`);
    console.log(`   • Total products to update: ${updates.length}\n`);

    if (updates.length === 0) {
      console.log('✅ No fixes needed! All products are correctly categorized and priced.');
      return;
    }

    // Show examples of NFA fixes specifically
    const nfaFixes = updates.filter(u => u.correctCategory === 'NFA Products' && u.needsCategoryFix);
    console.log(`🎯 NFA Products to fix: ${nfaFixes.length}`);
    nfaFixes.slice(0, 5).forEach(fix => {
      console.log(`   ${fix.sku} - ${fix.name.substring(0, 60)}...`);
      console.log(`     ${fix.currentCategory} → ${fix.correctCategory} (${fix.reason})`);
      console.log('');
    });

    // Show examples of other critical fixes
    console.log('📝 Other critical fixes:');
    updates.filter(u => !nfaFixes.includes(u)).slice(0, 5).forEach(update => {
      console.log(`   ${update.sku} - ${update.name.substring(0, 50)}... (${update.reason})`);
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

    // Apply fixes in batches
    console.log('🔄 Applying comprehensive fixes...');
    let processed = 0;
    const batchSize = 50;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (update) => {
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
      }));

      processed += batch.length;
      console.log(`   ✅ Updated ${processed}/${updates.length} products...`);
    }

    console.log(`\n✅ Comprehensive fix completed successfully!`);
    console.log(`   • ${categorizationFixes} products recategorized`);
    console.log(`   • ${fflFixes} products FFL status corrected`);
    console.log(`   • ${pricingFixes} products Gold pricing corrected`);

    // Final verification - check for remaining issues
    console.log('\n🔍 Final verification...');
    
    // Check for NFA items still in wrong categories
    const remainingNFA = await db.select({
      sku: products.sku,
      name: products.name,
      category: products.category
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        or(
          // Look for suppressor/SBR keywords in names not in NFA category
          and(
            or(
              products.name.ilike('%suppressor%'),
              products.name.ilike('%silencer%'),
              products.name.ilike('%sbr%'),
              products.name.ilike('%short barrel%')
            ),
            products.category.ne('NFA Products')
          )
        )
      )
    );

    console.log(`   • Remaining potential NFA items in wrong categories: ${remainingNFA.length}`);
    if (remainingNFA.length > 0) {
      console.log('   🔍 Examples that may need manual review:');
      remainingNFA.slice(0, 3).forEach(item => {
        console.log(`     ${item.sku}: ${item.name} (in ${item.category})`);
      });
    }

    // Check for firearms still in Accessories
    const firearmAccessories = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, 'Accessories'),
          eq(products.requiresFFL, true)
        )
      );

    console.log(`   • Firearms still in Accessories: ${firearmAccessories.length}`);

    console.log('\n🎯 Comprehensive categorization fix complete!');

  } catch (error) {
    console.error('❌ Error during comprehensive fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();