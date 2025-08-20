// Refresh Zoho tokens using existing refresh token from JSON file
const axios = require('axios');
const fs = require('fs');

async function refreshZohoTokens() {
  try {
    console.log('🔄 Refreshing Zoho tokens from existing file...');
    
    // Load current tokens
    const tokenFile = '.zoho-tokens.json';
    if (!fs.existsSync(tokenFile)) {
      console.log('❌ No token file found at .zoho-tokens.json');
      return false;
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    console.log('📋 Current token status:', {
      hasAccessToken: !!tokenData.accessToken,
      hasRefreshToken: !!tokenData.refreshToken,
      expiresAt: new Date(tokenData.expiresAt).toLocaleString(),
      timeUntilExpiry: Math.round((tokenData.expiresAt - Date.now()) / 60000) + ' minutes'
    });

    if (!tokenData.refreshToken) {
      console.log('❌ No refresh token found in file');
      return false;
    }

    // Use environment variables for client credentials
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.log('❌ Missing ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET environment variables');
      return false;
    }

    console.log('🔄 Attempting token refresh...');
    
    // Refresh the access token
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refreshToken
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Update token data
    const newTokenData = {
      ...tokenData,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || tokenData.refreshToken,
      expiresAt: Date.now() + (response.data.expires_in * 1000),
      lastRefreshed: new Date().toISOString()
    };

    // Save updated tokens
    fs.writeFileSync(tokenFile, JSON.stringify(newTokenData, null, 2));
    
    console.log('✅ Tokens refreshed successfully!', {
      newAccessTokenLength: response.data.access_token.length,
      expiresIn: response.data.expires_in + ' seconds',
      newExpiryTime: new Date(newTokenData.expiresAt).toLocaleString()
    });

    // Test the new token with a simple API call
    console.log('\n🧪 Testing refreshed token...');
    const testResponse = await axios.get('https://www.zohoapis.com/crm/v2/users', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${response.data.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.data?.users?.length > 0) {
      const user = testResponse.data.users[0];
      console.log('✅ Token test successful! User info:', {
        name: user.full_name,
        email: user.email,
        role: user.role?.name
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Token refresh failed:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorCode: error.response?.data?.code,
      errorMessage: error.response?.data?.message,
      details: error.response?.data
    });

    return false;
  }
}

refreshZohoTokens().then(success => {
  if (success) {
    console.log('\n🎉 Token refresh complete - Zoho CRM is now fully functional!');
  } else {
    console.log('\n⚠️  Token refresh failed - manual authorization may be required');
  }
  process.exit(success ? 0 : 1);
});