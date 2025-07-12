/**
 * Configure Algolia Accessory Facets
 * Adds missing accessory filter fields to Algolia index configuration
 */

import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const ALGOLIA_BASE_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products`;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error('❌ Missing required Algolia credentials');
  process.exit(1);
}

async function configureAccessoryFacets() {
  console.log('🔧 Starting Algolia accessory facet configuration...');
  
  try {
    // Get current settings
    console.log('📊 Getting current Algolia settings...');
    const currentSettings = await axios.get(`${ALGOLIA_BASE_URL}/settings`, {
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      }
    });

    const currentFacets = currentSettings.data.attributesForFaceting || [];
    console.log(`📈 Current facets: ${currentFacets.length} fields`);

    // Add missing accessory facet fields
    const newFacets = [
      'accessoryType',
      'compatibility', 
      'material',
      'mountType'
    ];

    // Merge with existing facets, avoiding duplicates
    const allFacets = [...new Set([...currentFacets, ...newFacets])];
    
    console.log(`🎯 Adding ${newFacets.length} new accessory facet fields...`);
    console.log(`   - accessoryType`);
    console.log(`   - compatibility`);
    console.log(`   - material`);  
    console.log(`   - mountType`);

    // Update Algolia settings
    const updateResponse = await axios.put(`${ALGOLIA_BASE_URL}/settings`, {
      attributesForFaceting: allFacets
    }, {
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📤 Settings update response: ${updateResponse.status} - ${updateResponse.data.taskID}`);
    console.log(`📊 Total facets configured: ${allFacets.length} fields`);

    // Verify the update
    console.log('✅ Verifying configuration...');
    const verifyResponse = await axios.get(`${ALGOLIA_BASE_URL}/settings`, {
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      }
    });

    const updatedFacets = verifyResponse.data.attributesForFaceting || [];
    const hasAccessoryType = updatedFacets.includes('accessoryType');
    const hasCompatibility = updatedFacets.includes('compatibility');
    const hasMaterial = updatedFacets.includes('material');
    const hasMountType = updatedFacets.includes('mountType');

    console.log(`📈 Verification results:`);
    console.log(`   - accessoryType: ${hasAccessoryType ? '✅' : '❌'}`);
    console.log(`   - compatibility: ${hasCompatibility ? '✅' : '❌'}`);
    console.log(`   - material: ${hasMaterial ? '✅' : '❌'}`);
    console.log(`   - mountType: ${hasMountType ? '✅' : '❌'}`);

    if (hasAccessoryType && hasCompatibility && hasMaterial && hasMountType) {
      console.log('🎉 All accessory facet fields successfully configured!');
      console.log('🔍 Accessory filtering should now work properly');
    } else {
      console.log('⚠️  Some accessory facet fields may not be configured correctly');
    }

  } catch (error) {
    console.error('❌ Error configuring accessory facets:', error);
    throw error;
  }
}

// Run the configuration
configureAccessoryFacets()
  .then(() => {
    console.log('✅ Accessory facet configuration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to configure accessory facets:', error);
    process.exit(1);
  });