#!/usr/bin/env tsx
/**
 * Check Aero Lower Issue
 * Investigate why AERO AR15 ENHANCED COMPLETE LWR STR is still in rifles
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkAeroLowerIssue() {
  console.log('🔍 Checking Aero Lower Issue...');
  
  try {
    // Check if the specific product exists and its current category
    const aeroProduct = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE name LIKE '%AERO%' AND name LIKE '%LWR%'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${aeroProduct.rows.length} AERO LWR products`);
    
    if (aeroProduct.rows.length > 0) {
      console.log('🔧 AERO LWR PRODUCTS:');
      aeroProduct.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.category}) - ${p.receiver_type || 'No receiver type'}`);
      });
    }
    
    // Check current category totals
    const categoryTotals = await db.execute(sql`
      SELECT 
        category,
        COUNT(*) as count
      FROM products 
      WHERE category IN ('Rifles', 'Uppers/Lowers')
      GROUP BY category
    `);
    
    console.log('\n📊 CATEGORY TOTALS:');
    categoryTotals.rows.forEach(c => {
      console.log(`  ${c.category}: ${c.count}`);
    });
    
    // Check Uppers/Lowers receiver type distribution
    const receiverTypes = await db.execute(sql`
      SELECT 
        receiver_type,
        COUNT(*) as count
      FROM products 
      WHERE category = 'Uppers/Lowers'
      GROUP BY receiver_type
      ORDER BY count DESC
    `);
    
    console.log('\n📊 UPPERS/LOWERS RECEIVER TYPE DISTRIBUTION:');
    receiverTypes.rows.forEach(rt => {
      console.log(`  ${rt.receiver_type || 'NULL'}: ${rt.count}`);
    });
    
    // Check if there are any receiver type nulls that need updating
    const nullReceiverTypes = await db.execute(sql`
      SELECT 
        id, name, sku, category, receiver_type
      FROM products 
      WHERE category = 'Uppers/Lowers' AND receiver_type IS NULL
      LIMIT 10
    `);
    
    console.log(`\n📊 NULL RECEIVER TYPES: ${nullReceiverTypes.rows.length}`);
    if (nullReceiverTypes.rows.length > 0) {
      console.log('🔧 SAMPLE NULL RECEIVER TYPES:');
      nullReceiverTypes.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error in check:', error);
  }
}

checkAeroLowerIssue();