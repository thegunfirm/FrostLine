// Debug the actual token structure and API call details
const axios = require('axios');
const fs = require('fs');

async function debugTokenStructure() {
  try {
    console.log('🔍 Debugging token structure and API calls...');
    
    const tokenFile = '.zoho-tokens.json';
    if (!fs.existsSync(tokenFile)) {
      console.log('❌ No token file found');
      return;
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    console.log('📋 Token structure:', {
      accessTokenLength: tokenData.accessToken?.length,
      accessTokenPrefix: tokenData.accessToken?.substring(0, 10) + '...',
      refreshTokenLength: tokenData.refreshToken?.length,
      expiresAt: new Date(tokenData.expiresAt).toLocaleString(),
      hasApiDomain: !!tokenData.api_domain,
      apiDomain: tokenData.api_domain
    });

    // Test with different API endpoints to see what works
    const testEndpoints = [
      { name: 'Organization Info', url: 'https://www.zohoapis.com/crm/v2/org' },
      { name: 'Users (minimal)', url: 'https://www.zohoapis.com/crm/v2/users?per_page=1' },
      { name: 'Deals (minimal)', url: 'https://www.zohoapis.com/crm/v2/deals?per_page=1' },
      { name: 'Settings', url: 'https://www.zohoapis.com/crm/v2/settings/modules' }
    ];

    for (const endpoint of testEndpoints) {
      console.log(`\n🧪 Testing ${endpoint.name}...`);
      try {
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${tokenData.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log(`✅ ${endpoint.name} - Success:`, {
          status: response.status,
          hasData: !!response.data,
          dataKeys: Object.keys(response.data || {})
        });

        // Log some sample data if available
        if (response.data && endpoint.name === 'Organization Info') {
          console.log('   Organization:', response.data.org?.[0]?.company_name || 'Not found');
        }
        if (response.data && endpoint.name === 'Users (minimal)' && response.data.users) {
          console.log('   First user:', response.data.users[0]?.full_name || 'Not found');
        }

      } catch (error) {
        console.log(`❌ ${endpoint.name} - Failed:`, {
          status: error.response?.status,
          error: error.response?.data?.code || error.message,
          message: error.response?.data?.message,
          details: error.response?.data?.details
        });
      }
    }

    // Test token introspection if available
    console.log('\n🔍 Testing token introspection...');
    try {
      const introspectResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token/info', 
        new URLSearchParams({
          token: tokenData.accessToken
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      console.log('✅ Token info:', {
        scope: introspectResponse.data.scope,
        audience: introspectResponse.data.aud,
        expires: new Date(introspectResponse.data.exp * 1000).toLocaleString()
      });
    } catch (error) {
      console.log('❌ Token introspection failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugTokenStructure();