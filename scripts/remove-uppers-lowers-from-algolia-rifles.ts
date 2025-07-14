#!/usr/bin/env tsx
/**
 * Remove Uppers/Lowers from Algolia Rifles Category
 * Find and remove any uppers/lowers that are incorrectly categorized as rifles in Algolia
 */

async function removeUppersLowersFromAlgoliaRifles() {
  console.log('🔄 Removing uppers/lowers from Algolia rifles category...');
  
  try {
    // Search for uppers/lowers in rifles category
    const searchResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'upper OR lower OR receiver',
        filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
        hitsPerPage: 1000 // Get all results
      })
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    console.log(`📊 Found ${searchData.nbHits} uppers/lowers in rifles category`);
    
    if (searchData.nbHits === 0) {
      console.log('✅ No uppers/lowers found in rifles category');
      return;
    }
    
    // Filter for actual uppers/lowers based on keywords
    const actualUppersLowers = searchData.hits.filter(hit => {
      const name = (hit.name || hit.title || '').toLowerCase();
      return name.includes('upper') || name.includes('lower') || 
             (name.includes('receiver') && !name.includes('rifle'));
    });
    
    console.log(`📊 Found ${actualUppersLowers.length} actual uppers/lowers to remove`);
    
    if (actualUppersLowers.length === 0) {
      console.log('✅ No actual uppers/lowers to remove');
      return;
    }
    
    // Show what we're about to remove
    console.log('🗑️ Will remove the following products:');
    actualUppersLowers.slice(0, 10).forEach(product => {
      console.log(`  ${product.objectID}: ${product.name || product.title}`);
    });
    
    // Delete these products from Algolia
    const deleteRequests = actualUppersLowers.map(product => ({
      action: 'deleteObject',
      body: {
        objectID: product.objectID
      }
    }));
    
    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < deleteRequests.length; i += batchSize) {
      const batch = deleteRequests.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(deleteRequests.length / batchSize);
      
      await sendBatchToAlgolia(batch);
      console.log(`✅ Deleted batch ${batchNumber} of ${totalBatches}`);
    }
    
    // Wait for indexing
    console.log('⏳ Waiting for Algolia indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify removal
    await verifyRemoval();
    
    console.log('✅ Removal complete');
    
  } catch (error) {
    console.error('❌ Error in removal:', error);
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
    throw new Error(`Algolia batch operation failed: ${error}`);
  }
}

async function verifyRemoval() {
  console.log('🔍 Verifying removal...');
  
  const verifyResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
      'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'upper OR lower OR receiver',
      filters: 'departmentNumber:"05" AND categoryName:"Rifles"',
      hitsPerPage: 1
    })
  });
  
  if (verifyResponse.ok) {
    const verifyData = await verifyResponse.json();
    console.log(`📊 Remaining uppers/lowers in rifles: ${verifyData.nbHits}`);
    
    if (verifyData.nbHits > 0) {
      console.log('🚨 Still finding uppers/lowers in rifles category');
      verifyData.hits.forEach(hit => {
        console.log(`  ${hit.objectID}: ${hit.title || hit.name}`);
      });
    }
  }
  
  // Also check rifles count
  const riflesResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
  
  if (riflesResponse.ok) {
    const riflesData = await riflesResponse.json();
    console.log(`📊 Total rifles in Algolia: ${riflesData.nbHits}`);
  }
}

removeUppersLowersFromAlgoliaRifles();