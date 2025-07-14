#!/usr/bin/env tsx
/**
 * Configure Algolia Receiver Type Faceting
 * Add receiverType to Algolia index settings for faceting
 */

async function configureAlgoliaReceiverType() {
  console.log('🔧 Configuring Algolia receiverType faceting...');
  
  try {
    // Get current index settings
    const settingsResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
      method: 'GET',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      }
    });
    
    const currentSettings = await settingsResponse.json();
    console.log('📋 Current facets for attributes:', currentSettings.attributesForFaceting || []);
    
    // Add receiverType to faceting attributes if not already present
    const facetingAttributes = currentSettings.attributesForFaceting || [];
    
    if (!facetingAttributes.includes('receiverType')) {
      facetingAttributes.push('receiverType');
      
      // Update index settings
      const updateResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/settings`, {
        method: 'PUT',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attributesForFaceting: facetingAttributes
        })
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to update Algolia settings: ${error}`);
      }
      
      console.log('✅ Added receiverType to faceting attributes');
    } else {
      console.log('✅ receiverType already in faceting attributes');
    }
    
    // Wait for settings to be applied
    console.log('⏳ Waiting for settings to be applied...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test faceting
    console.log('\n🔍 Testing receiverType faceting...');
    const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
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
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('📊 Receiver Type Facets:', testData.facets?.receiverType || {});
      
      const facetCounts = testData.facets?.receiverType || {};
      const totalFaceted = Object.values(facetCounts).reduce((sum: number, count: any) => sum + count, 0);
      console.log(`📊 Total products with receiverType facet: ${totalFaceted}`);
    } else {
      const error = await testResponse.text();
      console.error('❌ Failed to test faceting:', error);
    }
    
    console.log('\n✅ Configuration complete!');
    
  } catch (error) {
    console.error('❌ Error configuring receiverType faceting:', error);
  }
}

configureAlgoliaReceiverType();