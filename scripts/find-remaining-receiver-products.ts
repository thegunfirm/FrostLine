#!/usr/bin/env tsx
/**
 * Find Remaining Receiver Products
 * Look for actions, receivers, and other components that should be in Uppers/Lowers
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function findRemainingReceiverProducts() {
  console.log('🔍 Finding remaining receiver products in rifles...');
  
  try {
    // Look for various receiver/action patterns
    const receiverProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%action%' OR
          LOWER(name) LIKE '%receiver%' OR
          LOWER(name) LIKE '%solus%' OR
          LOWER(name) LIKE '%build%kit%' OR
          LOWER(name) LIKE '%builder%' OR
          LOWER(name) LIKE '%matched%set%' OR
          LOWER(name) LIKE '%upper%' OR
          LOWER(name) LIKE '%lower%'
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${receiverProducts.rows.length} potential receiver products`);
    
    if (receiverProducts.rows.length > 0) {
      console.log('🔧 POTENTIAL RECEIVER PRODUCTS:');
      receiverProducts.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    // Check for the specific AERO SOLUS product
    const aeroSolus = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE name LIKE '%AERO SOLUS%'
      ORDER BY name
    `);
    
    console.log(`\n📊 Found ${aeroSolus.rows.length} AERO SOLUS products`);
    
    if (aeroSolus.rows.length > 0) {
      console.log('🎯 AERO SOLUS PRODUCTS:');
      aeroSolus.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.category})`);
      });
    }
    
    // Also check for any products with "frame" or "chassis" that might be receivers
    const frameProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%frame%' OR
          LOWER(name) LIKE '%chassis%' OR
          LOWER(name) LIKE '%blank%' OR
          LOWER(name) LIKE '%build%'
        )
      ORDER BY name
    `);
    
    console.log(`\n📊 Found ${frameProducts.rows.length} frame/chassis products`);
    
    if (frameProducts.rows.length > 0) {
      console.log('🔧 FRAME/CHASSIS PRODUCTS:');
      frameProducts.rows.slice(0, 20).forEach(p => {
        console.log(`  ${p.sku}: ${p.name}`);
      });
    }
    
    console.log('\n✅ Search complete');
    
  } catch (error) {
    console.error('❌ Error in search:', error);
  }
}

findRemainingReceiverProducts();