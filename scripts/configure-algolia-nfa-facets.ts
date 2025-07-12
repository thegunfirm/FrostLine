/**
 * Configure Algolia NFA Facets
 * Ensures NFA-specific faceting attributes are properly configured
 */

import { algoliasearch } from 'algoliasearch';

const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_API_KEY!
);

async function configureNFAFacets() {
  console.log('🔧 Configuring Algolia NFA Facets...');
  
  try {
    // Get current settings
    const currentSettings = await algoliaClient.getSettings({
      indexName: 'products'
    });
    console.log('📊 Current faceting attributes:', currentSettings.attributesForFaceting);
    
    // Ensure NFA faceting attributes are included
    const nfaFacets = ['nfaItemType', 'barrelLengthNFA', 'finishNFA'];
    const existingFacets = currentSettings.attributesForFaceting || [];
    
    // Add NFA facets if they don't exist
    const updatedFacets = [...new Set([...existingFacets, ...nfaFacets])];
    
    await algoliaClient.setSettings({
      indexName: 'products',
      indexSettings: {
        attributesForFaceting: updatedFacets
      }
    });
    
    console.log('✅ Updated Algolia faceting attributes:', updatedFacets);
    console.log('🎯 NFA facets configured successfully');
    
  } catch (error) {
    console.error('❌ Error configuring NFA facets:', error);
    throw error;
  }
}

// Run the configuration
configureNFAFacets().catch(console.error);