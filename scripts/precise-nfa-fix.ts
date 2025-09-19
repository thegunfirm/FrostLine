#!/usr/bin/env tsx

/**
 * Precise NFA Detection and Cleanup
 * 
 * This script correctly identifies ONLY actual NFA items and excludes:
 * - Flash suppressors (muzzle devices, NOT NFA)
 * - Suppressor cleaners (cleaning supplies, NOT NFA) 
 * - Suppressor adapters (threading accessories, NOT NFA)
 * - Suppressor covers/pouches (fabric accessories, NOT NFA)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, or, ilike, ne } from 'drizzle-orm';
import { products } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

function isActualNFAItem(name: string, description: string = ''): boolean {
  const combined = (name + ' ' + description).toLowerCase();
  
  // Exclude NON-NFA items first (most important!)
  if (combined.includes('flash suppressor') || 
      combined.includes('muzzle brake') ||
      combined.includes('compensator') ||
      combined.includes('thread protector') ||
      combined.includes('suppressor cleaner') ||
      combined.includes('suppressor adapter') ||
      combined.includes('suppressor mount') ||
      combined.includes('suppressor cover') ||
      combined.includes('suppressor pouch') ||
      combined.includes('suppressor case') ||
      combined.includes('suppressor kit') ||
      combined.includes('suppressor tool') ||
      combined.includes('cleaning') ||
      combined.includes('adapter') ||
      combined.includes('mount') ||
      combined.includes('cover') ||
      combined.includes('pouch') ||
      combined.includes('case') ||
      combined.includes('kit') ||
      combined.includes('tool')) {
    return false;
  }
  
  // Only include ACTUAL NFA items
  return (
    // Sound suppressors/silencers (actual NFA items)
    (combined.includes('silencer') || 
     (combined.includes('suppressor') && !combined.includes('flash'))) ||
    
    // Short Barreled Rifles/Shotguns
    combined.includes(' sbr ') || 
    combined.includes('short barrel rifle') ||
    combined.includes('short barreled rifle') ||
    combined.includes(' sbs ') ||
    combined.includes('short barrel shotgun') ||
    combined.includes('short barreled shotgun') ||
    
    // Other NFA categories
    combined.includes('machine gun') ||
    combined.includes('full auto') ||
    combined.includes('any other weapon') ||
    combined.includes(' aow ')
  );
}

function categorizeNonNFAItem(name: string, description: string = ''): string {
  const combined = (name + ' ' + description).toLowerCase();
  
  if (combined.includes('flash suppressor') || combined.includes('muzzle brake') || 
      combined.includes('compensator') || combined.includes('thread protector')) {
    return 'Barrels, Choke Tubes & Muzzle Devices';
  }
  
  if (combined.includes('cleaner') || combined.includes('cleaning')) {
    return 'Cleaning Equipment';
  }
  
  if (combined.includes('adapter') || combined.includes('mount')) {
    return 'Parts';
  }
  
  if (combined.includes('cover') || combined.includes('pouch') || combined.includes('case')) {
    return 'Accessories';
  }
  
  return 'Accessories';
}

async function main() {
  console.log('🔧 Starting precise NFA detection and cleanup...\n');

  try {
    // Step 1: Find items currently in NFA Products that should NOT be there
    console.log('📊 Finding incorrectly categorized items in NFA Products...');
    
    const incorrectNFA = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: products.category,
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        eq(products.category, 'NFA Products')
      )
    );

    const toMoveFromNFA: Array<{
      id: number;
      sku: string;
      name: string;
      correctCategory: string;
      reason: string;
    }> = [];

    const toKeepInNFA: Array<{
      id: number;
      sku: string;
      name: string;
    }> = [];

    for (const item of incorrectNFA) {
      if (!isActualNFAItem(item.name, item.description || '')) {
        // This should NOT be in NFA Products
        const correctCategory = categorizeNonNFAItem(item.name, item.description || '');
        let reason = '';
        
        if (item.name.toLowerCase().includes('flash suppressor')) reason = 'Flash suppressor (muzzle device)';
        else if (item.name.toLowerCase().includes('cleaner')) reason = 'Cleaning supply';
        else if (item.name.toLowerCase().includes('adapter')) reason = 'Threading adapter';
        else if (item.name.toLowerCase().includes('cover')) reason = 'Accessory cover';
        else reason = 'Non-NFA accessory';
        
        toMoveFromNFA.push({
          id: item.id,
          sku: item.sku!,
          name: item.name,
          correctCategory,
          reason
        });
      } else {
        // This is correctly in NFA Products
        toKeepInNFA.push({
          id: item.id,
          sku: item.sku!,
          name: item.name
        });
      }
    }

    console.log(`📈 Analysis of current NFA Products category:`);
    console.log(`   • Items correctly in NFA Products: ${toKeepInNFA.length}`);
    console.log(`   • Items incorrectly in NFA Products: ${toMoveFromNFA.length}\n`);

    if (toMoveFromNFA.length > 0) {
      console.log('📝 Examples of items to move OUT of NFA Products:');
      toMoveFromNFA.slice(0, 10).forEach(item => {
        console.log(`   ${item.sku} - ${item.name.substring(0, 60)}...`);
        console.log(`     NFA Products → ${item.correctCategory} (${item.reason})`);
        console.log('');
      });

      // Move incorrect items OUT of NFA Products
      console.log('🔄 Moving incorrect items out of NFA Products...');
      let processed = 0;

      for (const item of toMoveFromNFA) {
        await db.update(products)
          .set({
            category: item.correctCategory,
            requiresFFL: false // These are accessories, not firearms
          })
          .where(eq(products.id, item.id));

        processed++;
        if (processed % 10 === 0) {
          console.log(`   ✅ Moved ${processed}/${toMoveFromNFA.length} items out of NFA Products...`);
        }
      }
    }

    // Step 2: Find actual NFA items that should be IN NFA Products but aren't
    console.log('\n📊 Finding actual NFA items in wrong categories...');
    
    const allActiveProducts = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: products.category,
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        ne(products.category, 'NFA Products')
      )
    );

    const actualNFAToMove: Array<{
      id: number;
      sku: string;
      name: string;
      currentCategory: string;
      reason: string;
    }> = [];

    for (const item of allActiveProducts) {
      if (isActualNFAItem(item.name, item.description || '')) {
        let reason = '';
        if (item.name.toLowerCase().includes('silencer')) reason = 'Sound silencer (NFA regulated)';
        else if (item.name.toLowerCase().includes('suppressor') && !item.name.toLowerCase().includes('flash')) reason = 'Sound suppressor (NFA regulated)';
        else if (item.name.toLowerCase().includes('sbr')) reason = 'Short Barreled Rifle (NFA regulated)';
        else if (item.name.toLowerCase().includes('short barrel')) reason = 'SBR/SBS (NFA regulated)';
        else reason = 'NFA regulated item';
        
        actualNFAToMove.push({
          id: item.id,
          sku: item.sku!,
          name: item.name,
          currentCategory: item.category!,
          reason
        });
      }
    }

    console.log(`📈 Found ${actualNFAToMove.length} actual NFA items in wrong categories`);

    if (actualNFAToMove.length > 0) {
      console.log('\n📝 Examples of actual NFA items to move TO NFA Products:');
      actualNFAToMove.slice(0, 5).forEach(item => {
        console.log(`   ${item.sku} - ${item.name.substring(0, 60)}...`);
        console.log(`     ${item.currentCategory} → NFA Products (${item.reason})`);
        console.log('');
      });

      // Move actual NFA items TO NFA Products
      console.log('🔄 Moving actual NFA items to NFA Products...');
      processed = 0;

      for (const item of actualNFAToMove) {
        await db.update(products)
          .set({
            category: 'NFA Products',
            requiresFFL: true // NFA items require FFL
          })
          .where(eq(products.id, item.id));

        processed++;
        if (processed % 10 === 0) {
          console.log(`   ✅ Moved ${processed}/${actualNFAToMove.length} items to NFA Products...`);
        }
      }
    }

    console.log(`\n✅ Precise NFA categorization completed!`);
    console.log(`   • ${toMoveFromNFA.length} non-NFA items moved out of NFA Products`);
    console.log(`   • ${actualNFAToMove.length} actual NFA items moved to NFA Products`);

    // Final verification
    console.log('\n🔍 Final verification...');
    
    const remainingFlashSuppressors = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, 'NFA Products'),
          ilike(products.name, '%flash suppressor%')
        )
      );

    const remainingSuppressorCleaners = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, 'NFA Products'),
          ilike(products.name, '%suppressor cleaner%')
        )
      );

    console.log(`   • Flash suppressors still in NFA Products: ${remainingFlashSuppressors.length}`);
    console.log(`   • Suppressor cleaners still in NFA Products: ${remainingSuppressorCleaners.length}`);
    
    if (remainingFlashSuppressors.length === 0 && remainingSuppressorCleaners.length === 0) {
      console.log('✅ NFA Products category now contains only actual NFA items!');
    }

    console.log('\n🎯 Precise NFA categorization complete!');

  } catch (error) {
    console.error('❌ Error during precise NFA fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();