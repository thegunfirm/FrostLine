#!/usr/bin/env tsx

/**
 * Fix Handgun Miscategorization
 * 
 * This script fixes products incorrectly categorized as "Handguns" 
 * that don't require FFL (which should be impossible for actual firearms)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { products } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

function categorizeAccessory(desc: string): string {
  if (desc.includes('case') || desc.includes('bag')) {
    if (desc.includes('hard')) {
      return 'Hard Gun Cases';
    } else {
      return 'Soft Gun Cases, Packs, Bags';
    }
  }
  
  if (desc.includes('holster') || desc.includes('pouch')) {
    return 'Holsters & Pouches';
  }
  
  if (desc.includes('cleaning') || desc.includes('kit')) {
    return 'Cleaning Equipment';
  }
  
  if (desc.includes('grip') || desc.includes('stock') || desc.includes('pad')) {
    return 'Grips, Pads, Stocks, Bipods';
  }
  
  return 'Accessories';
}

function recategorizeProduct(name: string, description: string): { category: string, requiresFFL: boolean } {
  const combined = (name + ' ' + description).toLowerCase();
  
  // If it contains accessory keywords, it's not a firearm
  if (combined.includes('case') || combined.includes('pouch') || combined.includes('bag') ||
      combined.includes('holster') || combined.includes('cover') || combined.includes('grip') ||
      combined.includes('cleaning') || combined.includes('kit') || combined.includes('tool') ||
      combined.includes('mount') || combined.includes('sling') || combined.includes('pad')) {
    return {
      category: categorizeAccessory(combined),
      requiresFFL: false
    };
  }
  
  // Check if it's actually a firearm with firearm indicators
  const isActualFirearm = (combined.includes('pistol') || combined.includes('handgun') || combined.includes('revolver')) &&
    (combined.includes('9mm') || combined.includes('45acp') || combined.includes('40sw') || 
     combined.includes('357') || combined.includes('38') || combined.includes('380') ||
     combined.includes('barrel') || combined.includes('trigger') || combined.includes('magazine') ||
     combined.includes('round') || combined.includes('rd') || combined.includes('shot') ||
     combined.includes('semi-automatic') || combined.includes('semi automatic'));
  
  if (isActualFirearm) {
    return {
      category: 'Handguns',
      requiresFFL: true
    };
  }
  
  // Default to accessories if unclear
  return {
    category: 'Accessories',
    requiresFFL: false
  };
}

async function main() {
  console.log('🔧 Fixing handgun miscategorization...\n');

  try {
    // Find all products in Handguns that don't require FFL
    console.log('📊 Finding miscategorized handgun products...');
    
    const suspiciousHandguns = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      category: products.category,
      requiresFFL: products.requiresFFL
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        eq(products.category, 'Handguns'),
        eq(products.requiresFFL, false)
      )
    );

    console.log(`📈 Found ${suspiciousHandguns.length} products categorized as Handguns that don't require FFL`);

    if (suspiciousHandguns.length === 0) {
      console.log('✅ No miscategorized handgun products found!');
      return;
    }

    // Analyze and categorize fixes
    const updates: Array<{
      id: number;
      sku: string;
      name: string;
      currentCategory: string;
      newCategory: string;
      newFFL: boolean;
      reason: string;
    }> = [];

    for (const product of suspiciousHandguns) {
      const { category: newCategory, requiresFFL: newFFL } = recategorizeProduct(
        product.name, 
        product.description || ''
      );
      
      let reason = '';
      if (newCategory !== 'Handguns') {
        if (product.name.toLowerCase().includes('case')) reason = 'Case/Bag item';
        else if (product.name.toLowerCase().includes('pouch')) reason = 'Pouch/Holster item';  
        else if (product.name.toLowerCase().includes('grip')) reason = 'Grip/Accessory item';
        else if (product.name.toLowerCase().includes('cleaning')) reason = 'Cleaning kit';
        else reason = 'Non-firearm accessory';
      } else {
        reason = 'Actual firearm - fix FFL requirement';
      }
      
      updates.push({
        id: product.id,
        sku: product.sku!,
        name: product.name,
        currentCategory: product.category!,
        newCategory,
        newFFL,
        reason
      });
    }

    // Group by fix type
    const toRecategorize = updates.filter(u => u.newCategory !== 'Handguns');
    const toFixFFL = updates.filter(u => u.newCategory === 'Handguns');

    console.log(`\n📋 Analysis Results:`);
    console.log(`   • Items to recategorize (non-firearms): ${toRecategorize.length}`);
    console.log(`   • Actual firearms needing FFL fix: ${toFixFFL.length}\n`);

    // Show examples of recategorization
    console.log('📝 Examples of items to recategorize:');
    toRecategorize.slice(0, 10).forEach(item => {
      console.log(`   ${item.sku} - ${item.name.substring(0, 60)}...`);
      console.log(`     Handguns → ${item.newCategory} (${item.reason})`);
      console.log('');
    });

    if (toFixFFL.length > 0) {
      console.log('🔫 Actual firearms needing FFL fix:');
      toFixFFL.slice(0, 5).forEach(item => {
        console.log(`   ${item.sku} - ${item.name.substring(0, 60)}...`);
        console.log(`     Will set requiresFFL = true (${item.reason})`);
        console.log('');
      });
    }

    // Apply fixes in batches
    console.log('🔄 Applying fixes...');
    let processed = 0;
    const batchSize = 50;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (update) => {
        await db.update(products)
          .set({
            category: update.newCategory,
            requiresFFL: update.newFFL
          })
          .where(eq(products.id, update.id));
      }));

      processed += batch.length;
      console.log(`   ✅ Updated ${processed}/${updates.length} products...`);
    }

    console.log(`\n✅ Handgun miscategorization fix completed!`);
    console.log(`   • ${toRecategorize.length} accessories moved to proper categories`);
    console.log(`   • ${toFixFFL.length} actual firearms now require FFL`);

    // Final verification
    const remainingSuspicious = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, 'Handguns'),
          eq(products.requiresFFL, false)
        )
      );

    console.log(`\n🔍 Final check: ${remainingSuspicious.length} handgun products still don't require FFL`);
    if (remainingSuspicious.length > 0) {
      console.log('⚠️  These may need manual review:');
      remainingSuspicious.slice(0, 3).forEach(item => {
        console.log(`   ${item.sku}: ${item.name}`);
      });
    } else {
      console.log('✅ All handgun products now properly require FFL!');
    }

    console.log('\n🎯 Handgun categorization fix complete!');

  } catch (error) {
    console.error('❌ Error during handgun fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();