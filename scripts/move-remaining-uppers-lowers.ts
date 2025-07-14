#!/usr/bin/env tsx
/**
 * Move Remaining Uppers/Lowers from Rifles
 * Move all remaining upper/lower receiver products from rifles to proper category
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function moveRemainingUppersLowers() {
  console.log('🔄 Moving remaining uppers/lowers from rifles...');
  
  try {
    // Find all products with LWR in rifles category
    const lwrProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (LOWER(name) LIKE '%lwr%' OR LOWER(name) LIKE '% lwr %')
      ORDER BY name
    `);
    
    console.log(`📊 Found ${lwrProducts.rows.length} LWR products in rifles`);
    
    // Find products that should be uppers/lowers (more comprehensive patterns)
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
          LOWER(name) LIKE '% upr %' OR
          LOWER(name) LIKE '%receiver%' AND (
            LOWER(name) LIKE '%lower%' OR 
            LOWER(name) LIKE '%upper%' OR
            LOWER(name) LIKE '%pillar%' OR
            LOWER(name) LIKE '%billet%'
          )
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${shouldBeUppersLowers.rows.length} products that should be uppers/lowers`);
    
    // Get unique products to move (combine both searches)
    const allProductsToMove = new Map();
    
    lwrProducts.rows.forEach(p => {
      allProductsToMove.set(p.id, p);
    });
    
    shouldBeUppersLowers.rows.forEach(p => {
      allProductsToMove.set(p.id, p);
    });
    
    const productsToMove = Array.from(allProductsToMove.values());
    console.log(`📊 Total unique products to move: ${productsToMove.length}`);
    
    if (productsToMove.length === 0) {
      console.log('✅ No products to move');
      return;
    }
    
    // Show what we're moving
    console.log('\n🔄 Moving the following products:');
    productsToMove.forEach(p => {
      console.log(`  ${p.sku}: ${p.name}`);
    });
    
    // Move products to Uppers/Lowers category with proper receiver type
    for (const product of productsToMove) {
      let receiverType = 'Lower'; // Default
      
      const nameUpper = product.name.toUpperCase();
      if (nameUpper.includes('UPPER') || nameUpper.includes('UPR')) {
        receiverType = 'Upper';
      } else if (nameUpper.includes('LOWER') || nameUpper.includes('LWR')) {
        // Check if it's a handgun lower or rifle lower
        if (nameUpper.includes('AR15') || nameUpper.includes('M4') || nameUpper.includes('M16') || nameUpper.includes('556') || nameUpper.includes('223')) {
          receiverType = 'Rifle Lower';
        } else {
          receiverType = 'Lower';
        }
      }
      
      await db.execute(sql`
        UPDATE products 
        SET 
          category = 'Uppers/Lowers',
          receiver_type = ${receiverType}
        WHERE id = ${product.id}
      `);
    }
    
    console.log(`✅ Updated ${productsToMove.length} products in database`);
    
    // Sync to Algolia
    console.log('\n🔄 Syncing to Algolia...');
    
    const algoliaUpdates = productsToMove.map(product => ({
      objectID: product.sku,
      categoryName: 'Uppers/Lowers',
      receiverType: product.name.toUpperCase().includes('UPPER') ? 'Upper' : 
                   product.name.toUpperCase().includes('AR15') ? 'Rifle Lower' : 'Lower'
    }));
    
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
    
    console.log('\n✅ Move complete!');
    
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
  
  // Check database
  const remainingLwrInRifles = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM products 
    WHERE department_number = '05' 
      AND category = 'Rifles'
      AND (LOWER(name) LIKE '%lwr%' OR LOWER(name) LIKE '% lwr %')
  `);
  
  const uppersLowersTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM products 
    WHERE category = 'Uppers/Lowers'
  `);
  
  const riflesTotal = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM products 
    WHERE department_number = '05' AND category = 'Rifles'
  `);
  
  console.log(`📊 DATABASE VERIFICATION:`);
  console.log(`  Remaining LWR in rifles: ${remainingLwrInRifles.rows[0].count}`);
  console.log(`  Total Uppers/Lowers: ${uppersLowersTotal.rows[0].count}`);
  console.log(`  Total Rifles: ${riflesTotal.rows[0].count}`);
  
  // Check Algolia
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
    
    console.log(`📊 ALGOLIA VERIFICATION:`);
    console.log(`  Rifles: ${riflesData.nbHits}`);
    console.log(`  Uppers/Lowers: ${uppersLowersData.nbHits}`);
  }
}

moveRemainingUppersLowers();