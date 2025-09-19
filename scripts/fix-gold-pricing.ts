#!/usr/bin/env tsx

/**
 * Fix Gold Pricing Formula
 * 
 * Corrects Gold pricing to use (MSRP + Dealer)/2 formula for all products
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { products } from '../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('🔧 Fixing Gold pricing formula...\n');

  try {
    console.log('📊 Finding products with incorrect Gold pricing...');
    
    // Get products that have pricing data but incorrect Gold calculation
    const incorrectPricing = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      priceMSRP: products.priceMSRP,
      priceWholesale: products.priceWholesale,
      priceGold: products.priceGold,
    }).from(products)
    .where(
      and(
        eq(products.isActive, true),
        isNotNull(products.priceMSRP),
        isNotNull(products.priceWholesale),
        ne(products.priceMSRP, '0'),
        ne(products.priceWholesale, '0')
      )
    );

    // Filter to only those that need corrections
    const toUpdate: Array<{
      id: number;
      sku: string;
      name: string;
      currentGold: string;
      correctGold: string;
      msrp: number;
      wholesale: number;
    }> = [];

    for (const product of incorrectPricing) {
      const msrp = parseFloat(product.priceMSRP || '0');
      const wholesale = parseFloat(product.priceWholesale || '0');
      const currentGold = parseFloat(product.priceGold || '0');
      
      if (msrp > 0 && wholesale > 0) {
        const correctGold = (msrp + wholesale) / 2;
        
        // Check if current gold price differs by more than $0.01
        if (Math.abs(currentGold - correctGold) > 0.01) {
          toUpdate.push({
            id: product.id,
            sku: product.sku!,
            name: product.name,
            currentGold: currentGold.toFixed(2),
            correctGold: correctGold.toFixed(2),
            msrp,
            wholesale
          });
        }
      }
    }

    console.log(`📈 Found ${toUpdate.length} products with incorrect Gold pricing`);

    if (toUpdate.length === 0) {
      console.log('✅ All products already have correct Gold pricing!');
      return;
    }

    // Show examples
    console.log('📝 Examples of pricing corrections:');
    toUpdate.slice(0, 10).forEach(item => {
      console.log(`   ${item.sku} - ${item.name.substring(0, 50)}...`);
      console.log(`     MSRP: $${item.msrp.toFixed(2)}, Wholesale: $${item.wholesale.toFixed(2)}`);
      console.log(`     Gold: $${item.currentGold} → $${item.correctGold} (${item.msrp > item.wholesale ? 'MSRP+Dealer' : 'Dealer+MSRP'}/2)`);
      console.log('');
    });

    // Apply fixes in batches
    console.log('🔄 Updating Gold pricing...');
    let processed = 0;
    const batchSize = 100; // Larger batches for pricing updates

    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (update) => {
        await db.update(products)
          .set({
            priceGold: update.correctGold
          })
          .where(eq(products.id, update.id));
      }));

      processed += batch.length;
      console.log(`   ✅ Updated ${processed}/${toUpdate.length} products...`);
    }

    console.log(`\n✅ Gold pricing fix completed!`);
    console.log(`   • ${toUpdate.length} products updated with correct (MSRP + Dealer)/2 formula`);

    // Final verification
    console.log('\n🔍 Final verification...');
    
    const remainingIncorrect = await db.select().from(products)
      .where(
        and(
          eq(products.isActive, true),
          isNotNull(products.priceMSRP),
          isNotNull(products.priceWholesale),
          ne(products.priceMSRP, '0'),
          ne(products.priceWholesale, '0')
        )
      );

    let stillIncorrect = 0;
    for (const product of remainingIncorrect) {
      const msrp = parseFloat(product.priceMSRP || '0');
      const wholesale = parseFloat(product.priceWholesale || '0');
      const currentGold = parseFloat(product.priceGold || '0');
      
      if (msrp > 0 && wholesale > 0) {
        const correctGold = (msrp + wholesale) / 2;
        if (Math.abs(currentGold - correctGold) > 0.01) {
          stillIncorrect++;
        }
      }
    }

    console.log(`   • Products with incorrect Gold pricing remaining: ${stillIncorrect}`);
    if (stillIncorrect === 0) {
      console.log('✅ All products now have correct Gold pricing formula!');
    }

    console.log('\n🎯 Gold pricing fix complete!');

  } catch (error) {
    console.error('❌ Error during Gold pricing fix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();