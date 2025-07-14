#!/usr/bin/env tsx
/**
 * Move Action/Receiver Products
 * Move all action, receiver, and builder kit products to Uppers/Lowers category
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function moveActionReceiverProducts() {
  console.log('🔄 Moving action/receiver products to Uppers/Lowers...');
  
  try {
    // Find all action/receiver products that should be moved
    const actionReceiverProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%action%' OR
          LOWER(name) LIKE '%receiver%' OR
          LOWER(name) LIKE '%builder%set%' OR
          LOWER(name) LIKE '%builder%kit%' OR
          LOWER(name) LIKE '%chassis%' OR
          (LOWER(name) LIKE '%aero%' AND LOWER(name) LIKE '%solus%')
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${actionReceiverProducts.rows.length} action/receiver products to move`);
    
    if (actionReceiverProducts.rows.length === 0) {
      console.log('✅ No products to move');
      return;
    }
    
    // Show what we're moving
    console.log('\n🔄 Moving the following products:');
    actionReceiverProducts.rows.forEach(p => {
      console.log(`  ${p.sku}: ${p.name}`);
    });
    
    // Move products to Uppers/Lowers category with proper receiver type
    for (const product of actionReceiverProducts.rows) {
      let receiverType = 'Action'; // Default for action products
      
      const nameUpper = product.name.toUpperCase();
      if (nameUpper.includes('UPPER')) {
        receiverType = 'Upper';
      } else if (nameUpper.includes('LOWER') || nameUpper.includes('LWR')) {
        receiverType = 'Lower';
      } else if (nameUpper.includes('ACTION')) {
        receiverType = 'Action';
      } else if (nameUpper.includes('BUILDER') || nameUpper.includes('KIT')) {
        receiverType = 'Builder Kit';
      } else if (nameUpper.includes('CHASSIS')) {
        receiverType = 'Chassis';
      }
      
      await db.execute(sql`
        UPDATE products 
        SET 
          category = 'Uppers/Lowers',
          receiver_type = ${receiverType}
        WHERE id = ${product.id}
      `);
    }
    
    console.log(`✅ Updated ${actionReceiverProducts.rows.length} products in database`);
    
    // Sync to Algolia
    console.log('\n🔄 Syncing to Algolia...');
    
    const algoliaUpdates = actionReceiverProducts.rows.map(product => {
      const nameUpper = product.name.toUpperCase();
      let receiverType = 'Action';
      
      if (nameUpper.includes('UPPER')) {
        receiverType = 'Upper';
      } else if (nameUpper.includes('LOWER') || nameUpper.includes('LWR')) {
        receiverType = 'Lower';
      } else if (nameUpper.includes('ACTION')) {
        receiverType = 'Action';
      } else if (nameUpper.includes('BUILDER') || nameUpper.includes('KIT')) {
        receiverType = 'Builder Kit';
      } else if (nameUpper.includes('CHASSIS')) {
        receiverType = 'Chassis';
      }
      
      return {
        objectID: product.sku,
        categoryName: 'Uppers/Lowers',
        receiverType: receiverType
      };
    });
    
    // Send to Algolia in batches
    const batchSize = 100;
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(algoliaUpdates.length / batchSize);
      
      const requests = batch.map(update => ({
        action: 'partialUpdateObject',
        body: update
      }));
      
      await sendBatchToAlgolia(requests);
      console.log(`✅ Synced batch ${batchNumber} of ${totalBatches} to Algolia`);
    }
    
    // Wait for indexing
    console.log('⏳ Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the move
    await verifyMove();
    
    console.log('\n✅ Action/receiver move complete!');
    
  } catch (error) {
    console.error('❌ Error in move:', error);
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
    const error = await response.text();
    throw new Error(`Algolia batch update failed: ${error}`);
  }
}

async function verifyMove() {
  console.log('🔍 Verifying move...');
  
  // Check database totals
  const categoryTotals = await db.execute(sql`
    SELECT 
      category,
      COUNT(*) as count
    FROM products 
    WHERE category IN ('Rifles', 'Uppers/Lowers')
    GROUP BY category
  `);
  
  console.log(`📊 DATABASE TOTALS:`);
  categoryTotals.rows.forEach(c => {
    console.log(`  ${c.category}: ${c.count}`);
  });
  
  // Check for remaining action products in rifles
  const remainingActions = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM products 
    WHERE department_number = '05' 
      AND category = 'Rifles'
      AND (
        LOWER(name) LIKE '%action%' OR
        LOWER(name) LIKE '%builder%set%' OR
        LOWER(name) LIKE '%chassis%'
      )
  `);
  
  console.log(`📊 Remaining actions in rifles: ${remainingActions.rows[0].count}`);
  
  // Check Algolia totals
  const algoliaRiflesResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
  
  if (algoliaRiflesResponse.ok && algoliaUppersLowersResponse.ok) {
    const riflesData = await algoliaRiflesResponse.json();
    const uppersLowersData = await algoliaUppersLowersResponse.json();
    
    console.log(`📊 ALGOLIA TOTALS:`);
    console.log(`  Rifles: ${riflesData.nbHits}`);
    console.log(`  Uppers/Lowers: ${uppersLowersData.nbHits}`);
  }
}

moveActionReceiverProducts();