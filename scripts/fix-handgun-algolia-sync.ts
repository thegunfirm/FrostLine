#!/usr/bin/env tsx
/**
 * Fix Handgun Algolia Sync
 * Removes products that were moved to Uppers/Lowers from handgun results
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixHandgunAlgoliaSync() {
  console.log('🔧 Fixing handgun Algolia sync...');
  
  try {
    // Get all products that were moved to Uppers/Lowers category
    const movedProducts = await db.execute(sql`
      SELECT sku, name, category, receiver_type 
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${movedProducts.rows.length} products moved to Uppers/Lowers`);
    
    // Update these products in Algolia to ensure they're not in handgun results
    const algoliaUpdateRequests = [];
    
    for (const product of movedProducts.rows) {
      const updateData = {
        objectID: product.sku,
        categoryName: 'Uppers/Lowers',
        departmentNumber: '41',
        receiverType: product.receiver_type
      };
      
      algoliaUpdateRequests.push({
        action: 'partialUpdateObject',
        body: updateData
      });
      
      if (algoliaUpdateRequests.length >= 100) {
        await sendBatchToAlgolia(algoliaUpdateRequests);
        algoliaUpdateRequests.length = 0;
      }
    }
    
    // Send any remaining updates
    if (algoliaUpdateRequests.length > 0) {
      await sendBatchToAlgolia(algoliaUpdateRequests);
    }
    
    console.log('✅ Fixed handgun Algolia sync');
    
    // Verify the fix
    await verifyHandgunCount();
    
  } catch (error) {
    console.error('❌ Error fixing handgun Algolia sync:', error);
  }
}

async function sendBatchToAlgolia(requests: any[]) {
  const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  
  if (!response.ok) {
    throw new Error(`Algolia batch update failed: ${response.statusText}`);
  }
  
  console.log(`✅ Updated batch of ${requests.length} products in Algolia`);
}

async function verifyHandgunCount() {
  console.log('🔍 Verifying handgun count...');
  
  // Database count
  const dbCount = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM products 
    WHERE department_number = '01' AND category != 'Uppers/Lowers'
  `);
  
  console.log(`📊 Database handgun count: ${dbCount.rows[0].count}`);
  
  // Algolia count (simulated - would need actual API call)
  const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
  
  if (algoliaResponse.ok) {
    const algoliaData = await algoliaResponse.json();
    console.log(`📊 Algolia handgun count: ${algoliaData.nbHits}`);
    
    if (algoliaData.nbHits === parseInt(dbCount.rows[0].count)) {
      console.log('✅ Database and Algolia counts match!');
    } else {
      console.log('⚠️  Database and Algolia counts do not match');
    }
  }
}

fixHandgunAlgoliaSync();