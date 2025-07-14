#!/usr/bin/env tsx
/**
 * Investigate Rifles Search Results
 * Check what products are being returned when searching for upper/lower/receiver in rifles
 */

async function investigateRiflesSearchResults() {
  console.log('🔍 Investigating rifles search results...');
  
  try {
    // Search for uppers/lowers in rifles category - get actual results
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
        hitsPerPage: 50 // Get first 50 results
      })
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    console.log(`📊 Found ${searchData.nbHits} products total`);
    
    // Analyze the results
    console.log('\n📋 SAMPLE RESULTS:');
    searchData.hits.slice(0, 20).forEach((product, index) => {
      const name = product.name || product.title || 'Unknown';
      const category = product.categoryName || 'Unknown';
      const objectID = product.objectID || 'Unknown';
      
      console.log(`${index + 1}. ${objectID}: ${name} (${category})`);
    });
    
    // Count actual uppers/lowers vs false positives
    const actualUppersLowers = searchData.hits.filter(hit => {
      const name = (hit.name || hit.title || '').toLowerCase();
      return (name.includes('upper') || name.includes('lower')) && 
             !name.includes('rifle') && !name.includes('carbine') && 
             !name.includes('barrel') && !name.includes('bolt');
    });
    
    const receiverProducts = searchData.hits.filter(hit => {
      const name = (hit.name || hit.title || '').toLowerCase();
      return name.includes('receiver') && 
             !name.includes('rifle') && !name.includes('carbine') &&
             !name.includes('barrel') && !name.includes('bolt');
    });
    
    console.log(`\n📊 ANALYSIS:`);
    console.log(`Total search results: ${searchData.nbHits}`);
    console.log(`Actual uppers/lowers: ${actualUppersLowers.length}`);
    console.log(`Receiver products: ${receiverProducts.length}`);
    console.log(`False positives: ${searchData.nbHits - actualUppersLowers.length - receiverProducts.length}`);
    
    if (actualUppersLowers.length > 0) {
      console.log('\n🚨 ACTUAL UPPERS/LOWERS IN RIFLES:');
      actualUppersLowers.slice(0, 10).forEach(product => {
        console.log(`  ${product.objectID}: ${product.name || product.title}`);
      });
    }
    
    if (receiverProducts.length > 0) {
      console.log('\n🔧 RECEIVER PRODUCTS:');
      receiverProducts.slice(0, 10).forEach(product => {
        console.log(`  ${product.objectID}: ${product.name || product.title}`);
      });
    }
    
    // Also check what the frontend sees
    console.log('\n🔍 Testing frontend search...');
    
    const frontendResponse = await fetch('http://localhost:5000/api/search/algolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: {
          category: 'Rifles'
        },
        sort: 'relevance',
        page: 0,
        hitsPerPage: 24
      })
    });
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log(`📊 Frontend rifles results: ${frontendData.nbHits} products`);
      
      // Check if any contain upper/lower/receiver
      const frontendUppersLowers = frontendData.hits.filter(hit => {
        const name = (hit.title || hit.name || '').toLowerCase();
        return name.includes('upper') || name.includes('lower') || name.includes('receiver');
      });
      
      console.log(`📊 Frontend uppers/lowers in rifles: ${frontendUppersLowers.length}`);
      
      if (frontendUppersLowers.length > 0) {
        console.log('\n🚨 FRONTEND SHOWING UPPERS/LOWERS IN RIFLES:');
        frontendUppersLowers.forEach(product => {
          console.log(`  ${product.objectID}: ${product.title || product.name}`);
        });
      }
    }
    
    console.log('\n✅ Investigation complete');
    
  } catch (error) {
    console.error('❌ Error in investigation:', error);
  }
}

investigateRiflesSearchResults();