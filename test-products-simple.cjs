/**
 * Simple Products API test using CommonJS
 */
const axios = require('axios');

async function testProductsAccess() {
  try {
    console.log('🔍 Testing Zoho Products API access...');

    // Get config from environment  
    const apiHost = process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com';
    const accessToken = process.env.ZOHO_ACCESS_TOKEN;

    if (!accessToken) {
      console.log('❌ No ZOHO_ACCESS_TOKEN found');
      return { success: false, error: 'No access token' };
    }

    // Test the Products endpoint - handle case where apiHost already includes /crm/v2
    const url = apiHost.endsWith('/crm/v2') ? `${apiHost}/Products` : `${apiHost}/crm/v2/Products`;
    console.log(`📡 Testing: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Products API accessible');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Records: ${response.data?.data?.length || 0}`);

    return { 
      success: true, 
      status: response.status,
      recordCount: response.data?.data?.length || 0
    };

  } catch (error) {
    console.log('❌ Products API failed');
    console.log(`🚨 Error: ${error.response?.status} - ${error.response?.statusText}`);
    
    if (error.response?.data) {
      console.log('📄 Details:', JSON.stringify(error.response.data, null, 2));
    }

    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Run the test
testProductsAccess().then(result => {
  console.log('🏁 Test result:', result.success ? 'SUCCESS' : 'FAILED');
}).catch(err => {
  console.error('💥 Test error:', err);
});