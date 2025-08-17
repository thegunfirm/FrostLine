/**
 * Simple test to check if Zoho Products API is accessible
 */
import axios from 'axios';

async function testProductsAPIAccess() {
  try {
    console.log('🔍 Testing Zoho Products API access...');
    
    const config = {
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_ACCESS_TOKEN
    };

    if (!config.accessToken) {
      console.log('❌ No ZOHO_ACCESS_TOKEN found in environment');
      return;
    }

    // Handle case where apiHost already includes /crm/v2
    const baseUrl = config.apiHost.endsWith('/crm/v2') ? config.apiHost : `${config.apiHost}/crm/v2`;
    const fullUrl = `${baseUrl}/Products`;
    
    console.log(`📡 Testing endpoint: ${fullUrl}`);

    // Simple GET request to Products module
    const response = await axios.get(
      fullUrl,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Products API accessible');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Records found: ${response.data?.data?.length || 0}`);
    
    if (response.data?.data?.length > 0) {
      console.log(`🔍 Sample product ID: ${response.data.data[0].id}`);
    }

  } catch (error) {
    console.log('❌ Products API access failed');
    console.log(`🚨 Error: ${error.response?.status} - ${error.response?.statusText}`);
    
    if (error.response?.data) {
      console.log('📄 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testProductsAPIAccess().then(() => {
  console.log('🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});