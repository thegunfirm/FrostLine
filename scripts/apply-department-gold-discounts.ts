/**
 * Apply Department-Specific Gold Discounts
 * Uses CMS-configured department discounts to fix Gold pricing for products with matching Bronze/Gold pricing
 */

import { db } from "../server/db";
import { products, systemSettings } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface DepartmentDiscount {
  department: string;
  discount: number;
}

async function applyDepartmentGoldDiscounts() {
  console.log('🔄 Starting department-specific Gold discount application...');
  
  try {
    // Get all department-specific discount settings from CMS
    const discountSettings = await db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.category, 'pricing'),
        sql`${systemSettings.key} LIKE 'gold_discount_%'`
      ));

    console.log(`📊 Found ${discountSettings.length} department discount settings`);

    // Parse discount settings
    const departmentDiscounts: { [key: string]: number } = {};
    
    for (const setting of discountSettings) {
      if (setting.key === 'gold_discount_default') {
        departmentDiscounts['default'] = parseFloat(setting.value) / 100;
      } else {
        const deptMatch = setting.key.match(/gold_discount_dept_(\d+)/);
        if (deptMatch) {
          const dept = deptMatch[1];
          departmentDiscounts[dept] = parseFloat(setting.value) / 100;
        }
      }
    }

    console.log('📋 Department discount configuration:');
    Object.entries(departmentDiscounts).forEach(([dept, discount]) => {
      console.log(`   Dept ${dept}: ${(discount * 100).toFixed(1)}% discount`);
    });

    // Get all RSR products
    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    console.log(`📊 Total RSR products: ${allProducts.length}`);

    // Filter for products that need Gold discount applied
    const productsNeedingDiscount = allProducts.filter(product => {
      const bronzePrice = parseFloat(product.priceBronze?.toString() || '0');
      const goldPrice = parseFloat(product.priceGold?.toString() || '0');
      const mapPrice = parseFloat(product.priceMap?.toString() || '0');
      const msrpPrice = parseFloat(product.priceMsrp?.toString() || '0');
      
      // Apply discount if:
      // 1. Bronze equals Gold (no proper differentiation)
      // 2. OR if MAP is missing/zero/equals MSRP (indicating we need to use discount instead of MAP)
      return (bronzePrice > 0 && goldPrice > 0 && 
              (bronzePrice === goldPrice || 
               mapPrice === 0 || 
               mapPrice === msrpPrice));
    });

    console.log(`📊 Products needing Gold discount: ${productsNeedingDiscount.length}`);

    if (productsNeedingDiscount.length === 0) {
      console.log('✅ No products need Gold discount application');
      return;
    }

    // Group products by department for batch processing
    const productsByDepartment: { [key: string]: typeof productsNeedingDiscount } = {};
    
    for (const product of productsNeedingDiscount) {
      const dept = product.departmentNumber || 'default';
      if (!productsByDepartment[dept]) {
        productsByDepartment[dept] = [];
      }
      productsByDepartment[dept].push(product);
    }

    console.log('📊 Products by department:');
    Object.entries(productsByDepartment).forEach(([dept, products]) => {
      console.log(`   Dept ${dept}: ${products.length} products`);
    });

    let totalUpdated = 0;
    let totalErrors = 0;

    // Process each department
    for (const [dept, deptProducts] of Object.entries(productsByDepartment)) {
      const discountRate = departmentDiscounts[dept] || departmentDiscounts['default'] || 0.05;
      
      console.log(`\n🔄 Processing Department ${dept} (${deptProducts.length} products, ${(discountRate * 100).toFixed(1)}% discount)`);
      
      const batchSize = 100;
      const totalBatches = Math.ceil(deptProducts.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, deptProducts.length);
        const batch = deptProducts.slice(start, end);
        
        console.log(`   📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} products)`);
        
        for (const product of batch) {
          try {
            // For Bronze pricing, use MSRP if available, otherwise use current Bronze price
            const msrpPrice = parseFloat(product.priceMsrp?.toString() || '0');
            const currentBronzePrice = parseFloat(product.priceBronze?.toString() || '0');
            const bronzePrice = msrpPrice > 0 ? msrpPrice : currentBronzePrice;
            
            // Calculate new Gold price with department-specific discount
            const newGoldPrice = bronzePrice * (1 - discountRate);
            
            // Update the product
            await db.update(products)
              .set({
                priceBronze: bronzePrice,
                priceGold: newGoldPrice
              })
              .where(eq(products.id, product.id));
            
            totalUpdated++;
            
          } catch (error: any) {
            totalErrors++;
            console.error(`     ❌ Error updating ${product.sku}:`, error.message);
          }
        }
        
        console.log(`   📊 Batch ${i + 1} complete: ${totalUpdated} total updated, ${totalErrors} total errors`);
      }
    }

    console.log(`\n✅ Department-specific Gold discount application complete:`);
    console.log(`   📊 Total products updated: ${totalUpdated}`);
    console.log(`   ❌ Total errors: ${totalErrors}`);

    // Show sample results by department
    console.log('\n📋 Sample results by department:');
    
    for (const [dept, deptProducts] of Object.entries(productsByDepartment)) {
      if (deptProducts.length > 0) {
        const sampleProduct = deptProducts[0];
        const updatedProduct = await db
          .select()
          .from(products)
          .where(eq(products.id, sampleProduct.id))
          .limit(1);
        
        if (updatedProduct.length > 0) {
          const product = updatedProduct[0];
          const bronzePrice = parseFloat(product.priceBronze?.toString() || '0');
          const goldPrice = parseFloat(product.priceGold?.toString() || '0');
          const savings = bronzePrice - goldPrice;
          const savingsPercent = bronzePrice > 0 ? ((savings / bronzePrice) * 100).toFixed(1) : '0.0';
          const discountRate = departmentDiscounts[dept] || departmentDiscounts['default'] || 0.05;
          
          console.log(`   Dept ${dept} (${(discountRate * 100).toFixed(1)}% discount): ${product.sku}`);
          console.log(`     Bronze: $${bronzePrice.toFixed(2)} → Gold: $${goldPrice.toFixed(2)} (${savingsPercent}% savings)`);
        }
      }
    }

    // Final verification
    const finalCheck = await db
      .select({
        departmentNumber: products.departmentNumber,
        count: sql<number>`count(*)`
      })
      .from(products)
      .where(and(
        eq(products.distributor, 'RSR'),
        sql`${products.priceBronze} = ${products.priceGold}`,
        sql`${products.priceBronze} > 0`
      ))
      .groupBy(products.departmentNumber);

    console.log('\n🔍 Final verification - Products still with matching Bronze/Gold pricing:');
    if (finalCheck.length === 0) {
      console.log('   ✅ No products with matching Bronze/Gold pricing');
    } else {
      finalCheck.forEach(result => {
        console.log(`   Dept ${result.departmentNumber}: ${result.count} products`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error applying department-specific Gold discounts:', error);
  }
}

// Run the discount application
applyDepartmentGoldDiscounts().catch(console.error);