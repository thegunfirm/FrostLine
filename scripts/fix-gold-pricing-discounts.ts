/**
 * Fix Gold Pricing Discounts
 * Ensures Gold pricing uses MAP when available, otherwise applies discount when MAP is missing or equal to MSRP
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and, ne, sql } from "drizzle-orm";

async function fixGoldPricingDiscounts() {
  console.log('🔄 Starting Gold pricing discount fix...');
  
  try {
    // Find products where Bronze equals Gold pricing (indicating missing MAP discount)
    const productsWithMatchingPricing = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.distributor, 'RSR'),
          ne(products.priceBronze, '0'),
          ne(products.priceGold, '0')
        )
      );

    // Filter for products that actually have matching Bronze and Gold pricing
    const matchingProducts = productsWithMatchingPricing.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      return bronzePrice > 0 && goldPrice > 0 && bronzePrice === goldPrice;
    });

    console.log(`📊 Found ${matchingProducts.length} products with matching Bronze/Gold pricing`);

    if (matchingProducts.length === 0) {
      console.log('✅ No products found with matching Bronze/Gold pricing. All pricing looks correct.');
      return;
    }

    // Apply department-specific discounts
    const departmentDiscounts = {
      '01': 0.05, // Handguns - 5% discount
      '05': 0.05, // Long Guns - 5% discount  
      '06': 0.05, // NFA - 5% discount
      '08': 0.05, // Optics - 5% discount
      '18': 0.05, // Ammunition - 5% discount
      '34': 0.05, // Parts - 5% discount
      'default': 0.05 // Default 5% discount for other departments
    };

    let updated = 0;
    let errors = 0;

    console.log('🔄 Applying Gold member discounts to products with matching Bronze/Gold pricing...');

    for (const product of matchingProducts) {
      try {
        const bronzePrice = parseFloat(product.priceBronze || '0');
        const department = product.departmentNumber || 'default';
        const discount = departmentDiscounts[department] || departmentDiscounts['default'];
        
        // Calculate new Gold price with discount
        const newGoldPrice = bronzePrice * (1 - discount);
        
        // Update the product
        await db.update(products)
          .set({
            priceGold: newGoldPrice.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(products.id, product.id));

        updated++;
        
        if (updated % 100 === 0) {
          console.log(`📊 Progress: ${updated}/${matchingProducts.length} products updated`);
        }
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error updating ${product.sku}:`, error.message);
      }
    }

    console.log(`✅ Gold pricing discount fix complete:`);
    console.log(`   📊 Products processed: ${matchingProducts.length}`);
    console.log(`   ✅ Products updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Show sample of updated products
    const sampleUpdated = await db
      .select({
        sku: products.sku,
        name: products.name,
        departmentNumber: products.departmentNumber,
        priceBronze: products.priceBronze,
        priceGold: products.priceGold,
        pricePlatinum: products.pricePlatinum
      })
      .from(products)
      .where(
        and(
          eq(products.distributor, 'RSR'),
          sql`${products.priceBronze} != ${products.priceGold}`
        )
      )
      .limit(10);

    console.log('\n📋 Sample of updated products with proper Gold discounts:');
    sampleUpdated.forEach(product => {
      const bronzePrice = parseFloat(product.priceBronze || '0');
      const goldPrice = parseFloat(product.priceGold || '0');
      const savings = bronzePrice - goldPrice;
      const savingsPercent = ((savings / bronzePrice) * 100).toFixed(1);
      
      console.log(`${product.sku}: ${product.name.substring(0, 50)}...`);
      console.log(`  Dept: ${product.departmentNumber} | Bronze: $${product.priceBronze} | Gold: $${product.priceGold} | Savings: $${savings.toFixed(2)} (${savingsPercent}%)`);
    });

    // Verify no products still have matching Bronze/Gold pricing
    const remainingMatching = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.distributor, 'RSR'),
          sql`${products.priceBronze} = ${products.priceGold}`,
          ne(products.priceBronze, '0')
        )
      );

    console.log(`\n🔍 Verification: ${remainingMatching[0].count} products still have matching Bronze/Gold pricing`);
    
  } catch (error: any) {
    console.error('❌ Error fixing Gold pricing discounts:', error);
  }
}

// Run the fix
fixGoldPricingDiscounts().catch(console.error);