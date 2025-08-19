const axios = require('axios');
const fs = require('fs');

async function refreshZohoToken() {
  try {
    console.log('🔄 Starting Zoho token refresh...');
    
    // Load current refresh token from environment or file
    let refreshToken = process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN;
    
    if (!refreshToken) {
      // Try loading from file
      if (fs.existsSync('.zoho-tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
        refreshToken = tokens.refreshToken;
      }
    }
    
    if (!refreshToken) {
      console.log('❌ No refresh token available');
      return false;
    }
    
    const clientId = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
    const clientSecret = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET;
    
    console.log('Client ID:', clientId?.substring(0, 15) + '...');
    console.log('Refresh token:', refreshToken.substring(0, 15) + '...');
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    if (response.data.access_token) {
      const newTokens = {
        accessToken: response.data.access_token,
        refreshToken: refreshToken, // Keep existing refresh token
        expiresAt: Date.now() + (3600 * 1000), // 1 hour from now
        lastRefresh: Date.now()
      };
      
      // Save to file
      fs.writeFileSync('.zoho-tokens.json', JSON.stringify(newTokens, null, 2));
      console.log('✅ Token refreshed and saved');
      
      // Test the token
      const testResponse = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: { 'Authorization': `Zoho-oauthtoken ${response.data.access_token}` }
      });
      
      console.log('🎯 Token test successful - Status:', testResponse.status);
      console.log('Authentication is now working!');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    return false;
  }
}

refreshZohoToken();