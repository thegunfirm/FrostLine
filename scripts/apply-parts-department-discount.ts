/**
 * Apply Parts Department Discount
 * Updates Parts (Department 34) products to use 5% Gold discount when Bronze/Gold pricing is identical
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function applyPartsDepartmentDiscount() {
  console.log('🔧 Starting Parts department discount application...');

  try {
    // Get all Parts products with identical Bronze/Gold pricing
    const partsWithMatchingPricing = await db.select()
      .from(products)
      .where(and(
        eq(products.departmentNumber, '34'),
        eq(products.priceBronze, products.priceGold)
      ));

    console.log(`📦 Found ${partsWithMatchingPricing.length} Parts products with matching Bronze/Gold pricing`);

    if (partsWithMatchingPricing.length === 0) {
      console.log('✅ No Parts products need pricing updates');
      return;
    }

    let updatedCount = 0;
    
    // Apply 5% Gold discount to each product
    for (const product of partsWithMatchingPricing) {
      try {
        // Calculate 5% Gold discount from Bronze price
        const bronzePrice = parseFloat(product.priceBronze);
        const goldPrice = bronzePrice * 0.95; // 5% discount
        
        // Update the product with new Gold pricing
        await db.update(products)
          .set({
            priceGold: goldPrice.toFixed(2)
          })
          .where(eq(products.id, product.id));
        
        updatedCount++;
        
        if (updatedCount % 50 === 0) {
          console.log(`📝 Updated ${updatedCount} Parts products...`);
        }
      } catch (error) {
        console.error(`❌ Error updating product ${product.sku}:`, error);
      }
    }

    console.log(`✅ Parts department discount complete! Updated ${updatedCount} products`);
    console.log(`📊 Parts products now have 5% Gold member savings`);

    // Verify the results
    const remainingMatchingPricing = await db.select()
      .from(products)
      .where(and(
        eq(products.departmentNumber, '34'),
        eq(products.priceBronze, products.priceGold)
      ));

    console.log(`🔍 Verification: ${remainingMatchingPricing.length} Parts products still have matching pricing`);

  } catch (error) {
    console.error('❌ Parts department discount failed:', error);
    throw error;
  }
}

// Run the script
applyPartsDepartmentDiscount()
  .then(() => {
    console.log('✅ Parts department discount application complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

export { applyPartsDepartmentDiscount };