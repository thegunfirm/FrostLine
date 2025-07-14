#!/usr/bin/env tsx
/**
 * Check Aero Lower Issue
 * Investigate why AERO AR15 ENHANCED COMPLETE LWR STR is still in rifles
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkAeroLowerIssue() {
  console.log('🔍 Checking Aero lower issue...');
  
  try {
    // Find the specific product
    const aeroProduct = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE name LIKE '%AERO AR15 ENHANCED COMPLETE LWR%'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${aeroProduct.rows.length} Aero enhanced complete lower products`);
    
    if (aeroProduct.rows.length > 0) {
      console.log('📋 AERO LOWER PRODUCTS:');
      aeroProduct.rows.forEach(p => {
        console.log(`  ID: ${p.id}, SKU: ${p.sku}`);
        console.log(`  Name: ${p.name}`);
        console.log(`  Category: ${p.category}`);
        console.log(`  Receiver Type: ${p.receiver_type}`);
        console.log(`  ---`);
      });
    }
    
    // Check for all products with "LWR" in the name that are still in rifles
    const lwrInRifles = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (LOWER(name) LIKE '%lwr%' OR LOWER(name) LIKE '% lwr %')
      ORDER BY name
    `);
    
    console.log(`📊 Found ${lwrInRifles.rows.length} products with LWR in rifles category`);
    
    if (lwrInRifles.rows.length > 0) {
      console.log('🚨 LWR PRODUCTS IN RIFLES:');
      lwrInRifles.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    // Check for all products with "UPPER" in the name that are still in rifles
    const upperInRifles = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND LOWER(name) LIKE '%upper%'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${upperInRifles.rows.length} products with UPPER in rifles category`);
    
    if (upperInRifles.rows.length > 0) {
      console.log('🚨 UPPER PRODUCTS IN RIFLES:');
      upperInRifles.rows.slice(0, 10).forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    // Check for products that should be uppers/lowers but aren't
    const shouldBeUppersLowers = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%complete%lower%' OR
          LOWER(name) LIKE '%complete%upper%' OR
          LOWER(name) LIKE '%stripped%lower%' OR
          LOWER(name) LIKE '%stripped%upper%' OR
          LOWER(name) LIKE '%enhanced%lower%' OR
          LOWER(name) LIKE '%enhanced%upper%' OR
          LOWER(name) LIKE '% lwr %' OR
          LOWER(name) LIKE '% upr %'
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${shouldBeUppersLowers.rows.length} products that should be uppers/lowers`);
    
    if (shouldBeUppersLowers.rows.length > 0) {
      console.log('🔧 PRODUCTS THAT SHOULD BE UPPERS/LOWERS:');
      shouldBeUppersLowers.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error in check:', error);
  }
}

checkAeroLowerIssue();