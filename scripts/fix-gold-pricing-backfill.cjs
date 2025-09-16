#!/usr/bin/env node

// Fix Gold pricing for existing products
// Run with: node scripts/fix-gold-pricing-backfill.js

const { Client } = require('pg');

async function calculateGoldPrice(priceMAP, priceWholesale, priceMSRP) {
  const mapPrice = parseFloat(priceMAP) || 0;
  const dealerPrice = parseFloat(priceWholesale) || 0;
  const msrpPrice = parseFloat(priceMSRP) || 0;
  
  // Gold = (MAP + Dealer Price) / 2
  if (mapPrice > 0 && dealerPrice > 0) {
    return ((mapPrice + dealerPrice) / 2).toFixed(2);
  }
  
  // Fallback: If MAP missing, use (MSRP + Dealer) / 2
  if (msrpPrice > 0 && dealerPrice > 0) {
    return ((msrpPrice + dealerPrice) / 2).toFixed(2);
  }
  
  // Last fallback: Dealer price + 10%
  if (dealerPrice > 0) {
    return (dealerPrice * 1.10).toFixed(2);
  }
  
  return "0.00";
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Get all products that need Gold pricing fixes
    const result = await client.query(`
      SELECT id, name, price_map, price_wholesale, price_msrp, price_gold 
      FROM products 
      WHERE price_wholesale > 0 
      ORDER BY id
    `);

    console.log(`📊 Found ${result.rows.length} products to potentially update`);

    let updated = 0;
    let skipped = 0;

    for (const product of result.rows) {
      const currentGold = parseFloat(product.price_gold) || 0;
      const newGoldPrice = await calculateGoldPrice(
        product.price_map, 
        product.price_wholesale, 
        product.price_msrp
      );
      const newGoldFloat = parseFloat(newGoldPrice);

      // Only update if the calculation gives us a different (better) result
      if (Math.abs(newGoldFloat - currentGold) > 0.01 && newGoldFloat > 0) {
        await client.query(`
          UPDATE products 
          SET price_gold = $1 
          WHERE id = $2
        `, [newGoldPrice, product.id]);

        console.log(`✅ Updated ${product.id} (${product.name?.substring(0, 30)}...): ${currentGold} → ${newGoldPrice}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n🎯 Backfill complete:`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products`);

    // Test a few specific products
    console.log(`\n🔍 Testing specific products:`);
    const testResult = await client.query(`
      SELECT id, name, price_map, price_wholesale, price_gold 
      FROM products 
      WHERE id IN (134393, 134405)
    `);

    testResult.rows.forEach(product => {
      console.log(`   Product ${product.id}: MAP=${product.price_map}, Dealer=${product.price_wholesale}, Gold=${product.price_gold}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);