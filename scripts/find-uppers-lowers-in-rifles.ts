#!/usr/bin/env tsx
/**
 * Find Uppers/Lowers in Rifles Category
 * Identify products that should be moved to Uppers/Lowers category
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function findUppersLowersInRifles() {
  console.log('🔍 Finding uppers/lowers in rifles category...');
  
  try {
    // Find products in rifles category that contain upper/lower keywords
    const suspiciousProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%upper%' OR 
          LOWER(name) LIKE '%lower%' OR
          LOWER(name) LIKE '%receiver%'
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${suspiciousProducts.rows.length} suspicious products in rifles`);
    
    // Analyze by keywords
    const upperProducts = suspiciousProducts.rows.filter(p => 
      p.name.toLowerCase().includes('upper')
    );
    
    const lowerProducts = suspiciousProducts.rows.filter(p => 
      p.name.toLowerCase().includes('lower')
    );
    
    const receiverProducts = suspiciousProducts.rows.filter(p => 
      p.name.toLowerCase().includes('receiver') && 
      !p.name.toLowerCase().includes('upper') && 
      !p.name.toLowerCase().includes('lower')
    );
    
    console.log(`\n📊 BREAKDOWN:`);
    console.log(`Upper products: ${upperProducts.length}`);
    console.log(`Lower products: ${lowerProducts.length}`);
    console.log(`Receiver products: ${receiverProducts.length}`);
    
    // Show samples
    if (upperProducts.length > 0) {
      console.log(`\n🔧 SAMPLE UPPER PRODUCTS:`);
      upperProducts.slice(0, 5).forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.manufacturer})`);
      });
    }
    
    if (lowerProducts.length > 0) {
      console.log(`\n🔧 SAMPLE LOWER PRODUCTS:`);
      lowerProducts.slice(0, 5).forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.manufacturer})`);
      });
    }
    
    if (receiverProducts.length > 0) {
      console.log(`\n🔧 SAMPLE RECEIVER PRODUCTS:`);
      receiverProducts.slice(0, 5).forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.manufacturer})`);
      });
    }
    
    // Check departments
    const deptAnalysis = {};
    suspiciousProducts.rows.forEach(p => {
      const dept = p.department_number;
      deptAnalysis[dept] = (deptAnalysis[dept] || 0) + 1;
    });
    
    console.log(`\n📊 DEPARTMENT ANALYSIS:`);
    Object.entries(deptAnalysis).forEach(([dept, count]) => {
      console.log(`  Department ${dept}: ${count} products`);
    });
    
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error in analysis:', error);
  }
}

findUppersLowersInRifles();