#!/usr/bin/env tsx
/**
 * Sync Moved Products to Algolia
 * Update all Uppers/Lowers products in Algolia with correct category and receiver type
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function syncMovedProductsToAlgolia() {
  console.log('🔄 Syncing moved products to Algolia...');
  
  try {
    // Get all Uppers/Lowers products
    const uppersLowersProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${uppersLowersProducts.rows.length} Uppers/Lowers products to sync`);
    
    if (uppersLowersProducts.rows.length === 0) {
      console.log('✅ No products to sync');
      return;
    }
    
    // Build Algolia updates
    const algoliaUpdates = uppersLowersProducts.rows.map(product => ({
      objectID: product.sku,
      categoryName: 'Uppers/Lowers',
      receiverType: product.receiver_type || 'Unknown'
    }));
    
    console.log('\n🔄 Syncing to Algolia...');
    
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
    
    console.log('\n⏳ Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify sync with Algolia
    console.log('\n🔍 Verifying Algolia sync...');
    const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    if (algoliaResponse.ok) {
      const algoliaData = await algoliaResponse.json();
      console.log(`📊 Algolia Uppers/Lowers count: ${algoliaData.nbHits}`);
      
      // Check receiver type facets
      const facetResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: '',
          filters: 'categoryName:"Uppers/Lowers"',
          hitsPerPage: 0,
          facets: ['receiverType']
        })
      });
      
      if (facetResponse.ok) {
        const facetData = await facetResponse.json();
        console.log('📊 Receiver Type Distribution in Algolia:', facetData.facets?.receiverType || {});
      }
    }
    
    console.log('\n✅ Sync complete!');
    
  } catch (error) {
    console.error('❌ Error in sync:', error);
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

syncMovedProductsToAlgolia();