/**
 * Batch Department-Specific Gold Discounts
 * Efficiently applies CMS-configured department discounts using SQL batch updates
 */

import { db } from "../server/db";
import { systemSettings } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function batchDepartmentGoldDiscounts() {
  console.log('🔄 Starting batch department-specific Gold discount application...');
  
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
        departmentDiscounts['default'] = parseFloat(setting.value);
      } else {
        const deptMatch = setting.key.match(/gold_discount_dept_(\d+)/);
        if (deptMatch) {
          const dept = deptMatch[1];
          departmentDiscounts[dept] = parseFloat(setting.value);
        }
      }
    }

    console.log('📋 Department discount configuration:');
    Object.entries(departmentDiscounts).forEach(([dept, discount]) => {
      console.log(`   Dept ${dept}: ${discount}% discount`);
    });

    // Get counts by department first
    const departmentCounts = await db.execute(sql`
      SELECT department_number, COUNT(*) as count
      FROM products 
      WHERE distributor = 'RSR' 
        AND price_bronze > 0 
        AND price_gold > 0
      GROUP BY department_number
      ORDER BY department_number
    `);

    console.log('\n📊 Products by department:');
    departmentCounts.rows.forEach((row: any) => {
      console.log(`   Dept ${row.department_number}: ${row.count} products`);
    });

    // Apply discounts for each department using batch SQL updates
    let totalUpdated = 0;
    
    for (const [dept, discountPercent] of Object.entries(departmentDiscounts)) {
      if (dept === 'default') continue; // Skip default, handle separately
      
      const discountMultiplier = (100 - discountPercent) / 100;
      
      console.log(`\n🔄 Processing Department ${dept} (${discountPercent}% discount)`);
      
      // Update all products in this department
      const updateResult = await db.execute(sql`
        UPDATE products 
        SET price_gold = CASE 
          WHEN price_map > 0 AND price_map != price_msrp THEN price_map
          ELSE price_bronze * ${discountMultiplier}
        END
        WHERE distributor = 'RSR' 
          AND department_number = ${dept}
          AND price_bronze > 0
      `);
      
      const rowsUpdated = updateResult.rowCount || 0;
      totalUpdated += rowsUpdated;
      
      console.log(`   ✅ Updated ${rowsUpdated} products in department ${dept}`);
    }

    // Handle products with no specific department (use default discount)
    const defaultDiscountPercent = departmentDiscounts['default'] || 5;
    const defaultDiscountMultiplier = (100 - defaultDiscountPercent) / 100;
    
    console.log(`\n🔄 Processing products with no department mapping (${defaultDiscountPercent}% discount)`);
    
    // Get list of departments we have specific settings for
    const configuredDepts = Object.keys(departmentDiscounts).filter(d => d !== 'default');
    const deptList = configuredDepts.map(d => `'${d}'`).join(',');
    
    const defaultUpdateResult = await db.execute(sql`
      UPDATE products 
      SET price_gold = CASE 
        WHEN price_map > 0 AND price_map != price_msrp THEN price_map
        ELSE price_bronze * ${defaultDiscountMultiplier}
      END
      WHERE distributor = 'RSR' 
        AND price_bronze > 0
        AND (department_number IS NULL OR department_number NOT IN (${sql.raw(deptList)}))
    `);
    
    const defaultRowsUpdated = defaultUpdateResult.rowCount || 0;
    totalUpdated += defaultRowsUpdated;
    
    console.log(`   ✅ Updated ${defaultRowsUpdated} products using default discount`);

    console.log(`\n✅ Batch department-specific Gold discount application complete:`);
    console.log(`   📊 Total products updated: ${totalUpdated}`);

    // Verification - check for products still with matching Bronze/Gold pricing
    const verificationResult = await db.execute(sql`
      SELECT department_number, COUNT(*) as count
      FROM products 
      WHERE distributor = 'RSR' 
        AND price_bronze = price_gold 
        AND price_bronze > 0
      GROUP BY department_number
      ORDER BY department_number
    `);

    console.log('\n🔍 Verification - Products still with matching Bronze/Gold pricing:');
    if (verificationResult.rows.length === 0) {
      console.log('   ✅ No products with matching Bronze/Gold pricing found');
    } else {
      verificationResult.rows.forEach((row: any) => {
        console.log(`   Dept ${row.department_number}: ${row.count} products`);
      });
    }

    // Show sample results by department
    console.log('\n📋 Sample results by department:');
    
    for (const [dept, discountPercent] of Object.entries(departmentDiscounts)) {
      if (dept === 'default') continue;
      
      const sampleResult = await db.execute(sql`
        SELECT sku, name, price_bronze, price_gold, price_map, price_msrp
        FROM products 
        WHERE distributor = 'RSR' 
          AND department_number = ${dept}
          AND price_bronze > 0
          AND price_gold > 0
        LIMIT 1
      `);
      
      if (sampleResult.rows.length > 0) {
        const product = sampleResult.rows[0] as any;
        const bronzePrice = parseFloat(product.price_bronze);
        const goldPrice = parseFloat(product.price_gold);
        const savings = bronzePrice - goldPrice;
        const savingsPercent = bronzePrice > 0 ? ((savings / bronzePrice) * 100).toFixed(1) : '0.0';
        
        console.log(`   Dept ${dept} (${discountPercent}% discount): ${product.sku}`);
        console.log(`     Bronze: $${bronzePrice.toFixed(2)} → Gold: $${goldPrice.toFixed(2)} (${savingsPercent}% savings)`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error applying batch department-specific Gold discounts:', error);
  }
}

// Run the batch discount application
batchDepartmentGoldDiscounts().catch(console.error);