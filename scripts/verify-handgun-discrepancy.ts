#!/usr/bin/env tsx
/**
 * Verify Handgun Discrepancy
 * Comprehensive analysis of database vs Algolia handgun counts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function verifyHandgunDiscrepancy() {
  console.log('🔍 Analyzing handgun discrepancy...');
  
  try {
    // 1. Database analysis
    console.log('\n📊 DATABASE ANALYSIS:');
    
    const dbHandguns = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE department_number = '01' AND category != 'Uppers/Lowers'
    `);
    console.log(`Handguns (dept 01, excluding Uppers/Lowers): ${dbHandguns.rows[0].count}`);
    
    const dbDept01Total = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE department_number = '01'
    `);
    console.log(`Total dept 01 products: ${dbDept01Total.rows[0].count}`);
    
    const dbUppersLowers = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE category = 'Uppers/Lowers'
    `);
    console.log(`Uppers/Lowers category: ${dbUppersLowers.rows[0].count}`);
    
    // 2. Check for products that might be in dept 01 but also in Uppers/Lowers
    const dbConflict = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE department_number = '01' AND category = 'Uppers/Lowers'
    `);
    console.log(`Products in dept 01 AND Uppers/Lowers: ${dbConflict.rows[0].count}`);
    
    // 3. Algolia analysis
    console.log('\n📊 ALGOLIA ANALYSIS:');
    
    // Count all dept 01 products in Algolia
    const algoliaAllDept01 = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01"',
        hitsPerPage: 1
      })
    });
    
    if (algoliaAllDept01.ok) {
      const data = await algoliaAllDept01.json();
      console.log(`Algolia dept 01 products: ${data.nbHits}`);
    }
    
    // Count handguns with exclusion
    const algoliaHandguns = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"01" AND NOT categoryName:"Uppers/Lowers"',
        hitsPerPage: 1
      })
    });
    
    if (algoliaHandguns.ok) {
      const data = await algoliaHandguns.json();
      console.log(`Algolia handguns (excluding Uppers/Lowers): ${data.nbHits}`);
    }
    
    // Count Uppers/Lowers in Algolia
    const algoliaUppersLowers = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:"Uppers/Lowers"',
        hitsPerPage: 1
      })
    });
    
    if (algoliaUppersLowers.ok) {
      const data = await algoliaUppersLowers.json();
      console.log(`Algolia Uppers/Lowers: ${data.nbHits}`);
    }
    
    // 4. Sample some products to see the difference
    console.log('\n🔍 SAMPLE PRODUCTS:');
    
    const sampleProducts = await db.execute(sql`
      SELECT sku, name, department_number, category, receiver_type 
      FROM products 
      WHERE department_number = '01'
      ORDER BY name
      LIMIT 10
    `);
    
    console.log('Sample dept 01 products:');
    for (const product of sampleProducts.rows) {
      console.log(`  ${product.sku}: ${product.name} (dept: ${product.department_number}, cat: ${product.category}, receiver: ${product.receiver_type})`);
    }
    
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error in analysis:', error);
  }
}

verifyHandgunDiscrepancy();