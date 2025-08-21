const axios = require('axios');

async function testZohoConnection() {
  console.log('🔍 Testing Zoho API Connection...');
  
  const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
  const refreshToken = process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN;
  const clientId = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
  const clientSecret = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET;
  
  console.log('📋 Token Status:');
  console.log(`   Access Token: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT SET'}`);
  console.log(`   Refresh Token: ${refreshToken ? `${refreshToken.substring(0, 20)}...` : 'NOT SET'}`);
  console.log(`   Client ID: ${clientId || 'NOT SET'}`);
  console.log(`   Client Secret: ${clientSecret ? 'SET' : 'NOT SET'}`);
  
  if (!accessToken) {
    console.log('❌ No access token available');
    return;
  }
  
  try {
    console.log('🔄 Testing Zoho CRM API access...');
    
    // Test basic API access with current token
    const response = await axios.get('https://www.zohoapis.com/crm/v2/org', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Zoho API Connection Successful!');
    console.log('📊 Organization Info:');
    console.log(`   Organization: ${response.data.org.company_name}`);
    console.log(`   Time Zone: ${response.data.org.time_zone}`);
    console.log(`   Currency: ${response.data.org.currency_symbol}`);
    
    // Test automatic token refresh functionality
    if (refreshToken && clientId && clientSecret) {
      console.log('🔄 Testing automatic token refresh...');
      
      const refreshResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        }
      });
      
      console.log('✅ Token refresh system working!');
      console.log(`   New Access Token: ${refreshResponse.data.access_token.substring(0, 20)}...`);
      console.log(`   Expires In: ${refreshResponse.data.expires_in} seconds`);
      
    } else {
      console.log('⚠️ Token refresh credentials incomplete');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Zoho API Error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data.message || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('🔄 Token expired, testing refresh...');
        
        if (refreshToken && clientId && clientSecret) {
          try {
            const refreshResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
              params: {
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token'
              }
            });
            
            console.log('✅ Token refreshed successfully!');
            console.log('📋 IMPORTANT: Update environment variable:');
            console.log(`ZOHO_WEBSERVICES_ACCESS_TOKEN=${refreshResponse.data.access_token}`);
            
          } catch (refreshError) {
            console.log('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
          }
        } else {
          console.log('❌ Cannot refresh token - missing credentials');
        }
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testZohoConnection();