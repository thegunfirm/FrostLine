#!/usr/bin/env tsx
/**
 * Check Uppers/Lowers in Rifles Category
 * Verify if uppers/lowers are still appearing in rifles category
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkUppersLowersInRifles() {
  console.log('🔍 Checking uppers/lowers in rifles category...');
  
  try {
    // Check database for uppers/lowers in rifles
    const riflesWithUppersLowers = await db.execute(sql`
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
      LIMIT 20
    `);
    
    console.log(`📊 DATABASE: Found ${riflesWithUppersLowers.rows.length} uppers/lowers in rifles category`);
    
    if (riflesWithUppersLowers.rows.length > 0) {
      console.log('🚨 PROBLEM: Uppers/lowers still in rifles category in database:');
      riflesWithUppersLowers.rows.forEach(p => {
        console.log(`  ${p.sku}: ${p.name} (${p.category})`);
      });
    }
    
    // Check total rifles count
    const riflesTotal = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' AND category = 'Rifles'
    `);
    
    // Check total uppers/lowers count
    const uppersLowersTotal = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM products 
      WHERE category = 'Uppers/Lowers'
    `);
    
    console.log(`📊 DATABASE TOTALS:`);
    console.log(`  Rifles: ${riflesTotal.rows[0].count}`);
    console.log(`  Uppers/Lowers: ${uppersLowersTotal.rows[0].count}`);
    
    // Check Algolia for comparison
    console.log('\n🔍 Checking Algolia index...');
    
    const algoliaRiflesResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'upper OR lower OR receiver',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
        hitsPerPage: 20
      })
    });
    
    if (algoliaRiflesResponse.ok) {
      const algoliaRiflesData = await algoliaRiflesResponse.json();
      console.log(`📊 ALGOLIA: Found ${algoliaRiflesData.nbHits} uppers/lowers in rifles category`);
      
      if (algoliaRiflesData.hits.length > 0) {
        console.log('🚨 PROBLEM: Uppers/lowers still in rifles category in Algolia:');
        algoliaRiflesData.hits.slice(0, 10).forEach(p => {
          console.log(`  ${p.objectID}: ${p.title || p.name} (${p.categoryName})`);
        });
      }
    }
    
    // Check Algolia total counts
    const algoliaRiflesCountResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
        hitsPerPage: 1
      })
    });
    
    const algoliaUppersLowersResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    if (algoliaRiflesCountResponse.ok && algoliaUppersLowersResponse.ok) {
      const riflesCount = await algoliaRiflesCountResponse.json();
      const uppersLowersCount = await algoliaUppersLowersResponse.json();
      
      console.log(`📊 ALGOLIA TOTALS:`);
      console.log(`  Rifles: ${riflesCount.nbHits}`);
      console.log(`  Uppers/Lowers: ${uppersLowersCount.nbHits}`);
    }
    
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error in check:', error);
  }
}

checkUppersLowersInRifles();