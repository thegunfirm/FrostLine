// Generate fresh Zoho OAuth tokens using the refresh mechanism
const fetch = require('node-fetch');

async function generateFreshZohoTokens() {
  console.log('🔄 GENERATING FRESH ZOHO OAUTH TOKENS\n');
  
  try {
    // Use the webservices credentials to generate fresh tokens
    const refreshUrl = 'https://accounts.zoho.com/oauth/v2/token';
    
    const refreshData = {
      refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN,
      client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
      client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
      grant_type: 'refresh_token'
    };
    
    console.log('📡 Requesting fresh tokens from Zoho...');
    console.log('Client ID:', process.env.ZOHO_WEBSERVICES_CLIENT_ID);
    console.log('Refresh Token Length:', process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN?.length || 'MISSING');
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(refreshData)
    });
    
    const responseText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', responseText);
    
    if (!response.ok) {
      console.error('❌ Token refresh failed');
      console.error('This usually means:');
      console.error('1. Refresh token has expired');
      console.error('2. Client credentials are incorrect');
      console.error('3. App needs to be re-authorized');
      return false;
    }
    
    const tokenData = JSON.parse(responseText);
    
    if (tokenData.access_token) {
      console.log('✅ Fresh access token generated!');
      console.log('Token length:', tokenData.access_token.length);
      console.log('Expires in:', tokenData.expires_in, 'seconds');
      
      // Test the new token immediately
      console.log('\n🧪 Testing fresh token with Zoho API...');
      
      const testResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/modules', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        console.log('✅ Fresh token works! API test successful');
        
        // Update the environment variable programmatically for this session
        process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = tokenData.access_token;
        console.log('✅ Token updated in current session');
        
        return {
          success: true,
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in
        };
      } else {
        const errorText = await testResponse.text();
        console.log('❌ Fresh token failed API test:', errorText);
        return false;
      }
    } else {
      console.error('❌ No access token in response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    return false;
  }
}

// Run the token generation
generateFreshZohoTokens().then((result) => {
  if (result && result.success) {
    console.log('\n🎉 FRESH TOKENS GENERATED SUCCESSFULLY!');
    console.log('Ready for end-to-end integration testing');
  } else {
    console.log('\n❌ Token generation failed - manual intervention needed');
  }
}).catch(error => {
  console.error('💥 Token generation script failed:', error);
});