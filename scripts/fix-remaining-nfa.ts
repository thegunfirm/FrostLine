#!/usr/bin/env tsx

/**
 * Fix Remaining NFA Items
 * 
 * Targeted script to fix the remaining 371 NFA items still in wrong categories
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

async function main() {
  console.log('🔧 Fixing remaining NFA items...\n');

  try {
    // Find NFA items in wrong categories
    console.log('📊 Finding remaining NFA items in wrong categories...');
    
    const nfaItems = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      category: products.category,
      requiresFFL: products.requiresFFL
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        or(
          ilike(products.name, '%suppressor%'),
          ilike(products.name, '%silencer%'),
          ilike(products.name, '%sbr%'),
          ilike(products.name, '%short barrel%'),
          ilike(products.name, '%sbs%'),
          ilike(products.name, '%short barreled shotgun%'),
          ilike(products.name, '%aow%'),
          ilike(products.name, '%any other weapon%'),
          ilike(products.name, '%machine gun%'),
          ilike(products.name, '%full auto%')
        ),
        ne(products.category, 'NFA Products')
      )
    );

    console.log(`📈 Found ${nfaItems.length} NFA items in wrong categories`);

    if (nfaItems.length === 0) {
      console.log('✅ No remaining NFA items found in wrong categories!');
      return;
    }

    // Show examples
    console.log('📝 Examples of NFA items to fix:');
    nfaItems.slice(0, 10).forEach(item => {
      console.log(`   ${item.sku} - ${item.name.substring(0, 60)}...`);
      console.log(`     ${item.category} → NFA Products`);
      console.log('');
    });

    // Apply fixes
    console.log('🔄 Moving NFA items to correct category...');
    let processed = 0;

    for (const item of nfaItems) {
      await db.update(products)
        .set({
          category: 'NFA Products',
          requiresFFL: true
        })
        .where(eq(products.id, item.id));

      processed++;
      if (processed % 10 === 0) {
        console.log(`   ✅ Updated ${processed}/${nfaItems.length} NFA items...`);
      }
    }

    console.log(`\n✅ NFA categorization fix completed!`);
    console.log(`   • ${nfaItems.length} NFA items moved to "NFA Products"`);
    console.log(`   • All items now require FFL`);

    // Final verification
    const remaining = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            ilike(products.name, '%suppressor%'),
            ilike(products.name, '%silencer%'),
            ilike(products.name, '%sbr%')
          ),
          ne(products.category, 'NFA Products')
        )
      );

    console.log(`\n🔍 Final check: ${remaining.length} NFA items still in wrong categories`);
    if (remaining.length === 0) {
      console.log('✅ All NFA items are now properly categorized!');
    } else {
      console.log('⚠️  These may need manual review:');
      remaining.slice(0, 3).forEach(item => {
        console.log(`   ${item.sku}: ${item.name} (in ${item.category})`);
      });
    }

    console.log('\n🎯 NFA fix complete!');

  } catch (error) {
    console.error('❌ Error during NFA fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();