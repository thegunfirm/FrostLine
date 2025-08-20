// Test actual Zoho CRM connection to verify tokens work
const axios = require('axios');
const fs = require('fs');

async function testZohoConnection() {
  try {
    console.log('🔍 Testing Zoho CRM connection...');
    
    // Load tokens from the file
    const tokenFile = '.zoho-tokens.json';
    if (!fs.existsSync(tokenFile)) {
      console.log('❌ No token file found');
      return false;
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    console.log('📋 Token data loaded:', {
      hasAccessToken: !!tokenData.accessToken,
      tokenLength: tokenData.accessToken?.length,
      expiresAt: new Date(tokenData.expiresAt).toLocaleString(),
      timeUntilExpiry: Math.round((tokenData.expiresAt - Date.now()) / 60000) + ' minutes'
    });

    // Test 1: Get user info
    console.log('\n🧪 Test 1: Getting user information...');
    const userResponse = await axios.get('https://www.zohoapis.com/crm/v2/users', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (userResponse.data?.users?.length > 0) {
      const user = userResponse.data.users[0];
      console.log('✅ User info retrieved successfully:', {
        name: user.full_name,
        email: user.email,
        role: user.role?.name,
        status: user.status
      });
    }

    // Test 2: Check Deals module access
    console.log('\n🧪 Test 2: Checking Deals module access...');
    const dealsResponse = await axios.get('https://www.zohoapis.com/crm/v2/deals?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Deals module access confirmed:', {
      statusCode: dealsResponse.status,
      hasData: !!dealsResponse.data?.data,
      dealCount: dealsResponse.data?.data?.length || 0
    });

    // Test 3: Check Products module access
    console.log('\n🧪 Test 3: Checking Products module access...');
    const productsResponse = await axios.get('https://www.zohoapis.com/crm/v2/products?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenData.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Products module access confirmed:', {
      statusCode: productsResponse.status,
      hasData: !!productsResponse.data?.data,
      productCount: productsResponse.data?.data?.length || 0
    });

    console.log('\n🎉 All tests passed! Zoho CRM connection is fully functional');
    return true;

  } catch (error) {
    console.error('❌ Zoho connection test failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorCode: error.response?.data?.code,
      errorMessage: error.response?.data?.message,
      details: error.response?.data?.details
    });

    // Check if it's a token expiration issue
    if (error.response?.status === 401) {
      console.log('\n💡 This appears to be an authentication issue. The token may need refreshing.');
    }

    return false;
  }
}

testZohoConnection().then(success => {
  if (success) {
    console.log('\n✨ Connection verification complete - system is working correctly');
  } else {
    console.log('\n⚠️  Connection verification failed - tokens may need refreshing');
  }
  process.exit(success ? 0 : 1);
});