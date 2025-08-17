/**
 * Test Products API via server's working Zoho integration
 */

async function testViaServer() {
  try {
    console.log('🔍 Testing Products API via server integration...');
    
    // Import the working ZohoService from the server
    const { ZohoService } = await import('./server/zoho-service.js');
    
    // Create instance with proper config
    const zohoService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      redirectUri: process.env.ZOHO_REDIRECT_URI,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST,
      apiHost: process.env.ZOHO_CRM_BASE,
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });

    // Test Products module access using the server's method
    console.log('📡 Testing Products module via makeAPIRequest...');
    const result = await zohoService.makeAPIRequest('Products', 'GET');
    
    console.log('✅ Products API accessible via server');
    console.log(`📊 Records found: ${result.data?.length || 0}`);
    
    return { success: true, recordCount: result.data?.length || 0 };

  } catch (error) {
    console.log('❌ Products API failed via server');
    console.log(`🚨 Error: ${error.message}`);
    
    // Check if it's specifically API_NOT_SUPPORTED
    if (error.message.includes('API_NOT_SUPPORTED')) {
      console.log('🎯 CONFIRMED: Products module API_NOT_SUPPORTED error');
      return { success: false, error: 'API_NOT_SUPPORTED', confirmed: true };
    }
    
    return { success: false, error: error.message };
  }
}

testViaServer().then(result => {
  console.log('🏁 Final result:', result);
  if (result.confirmed) {
    console.log('📋 ANSWER: Products module returns API_NOT_SUPPORTED error');
  }
}).catch(err => {
  console.error('💥 Test failed:', err.message);
});