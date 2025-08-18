const axios = require('axios');
const fs = require('fs');

class SimpleZohoTokenManager {
  constructor() {
    this.clientId = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET;
    this.tokenFile = '.zoho-tokens.json';
  }

  // Generate tokens from authorization code
  async generateFromAuthCode(authCode) {
    console.log('🔧 Generating tokens from auth code...');
    console.log('Client ID:', this.clientId ? 'Present' : 'Missing');
    console.log('Client Secret:', this.clientSecret ? 'Present' : 'Missing');
    console.log('Auth Code:', authCode ? 'Present' : 'Missing');
    
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: authCode,
          grant_type: 'authorization_code'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      console.log('Response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));

      if (response.data.access_token && response.data.refresh_token) {
        const tokens = {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (3600 * 1000),
          lastRefresh: Date.now()
        };

        this.saveTokens(tokens);
        console.log('✅ Tokens generated and saved');
        console.log('Access token length:', tokens.accessToken.length);
        console.log('Refresh token length:', tokens.refreshToken.length);
        
        // Test immediately
        const works = await this.testToken(tokens.accessToken);
        if (works) {
          console.log('✅ ZOHO API NOW WORKING');
          return tokens.accessToken;
        } else {
          console.log('❌ Generated token does not work');
        }
      } else {
        console.log('❌ Missing tokens in response:', response.data);
      }
    } catch (error) {
      console.log('❌ Token generation failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      console.log('Message:', error.message);
    }
    return null;
  }

  // Refresh existing token
  async refreshToken() {
    console.log('🔄 Refreshing token...');
    
    try {
      const stored = this.loadTokens();
      if (!stored?.refreshToken) {
        console.log('❌ No refresh token available');
        return null;
      }

      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
        new URLSearchParams({
          refresh_token: stored.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (response.data.access_token) {
        const tokens = {
          ...stored,
          accessToken: response.data.access_token,
          expiresAt: Date.now() + (3600 * 1000),
          lastRefresh: Date.now()
        };

        this.saveTokens(tokens);
        console.log('✅ Token refreshed');
        
        const works = await this.testToken(tokens.accessToken);
        if (works) {
          console.log('✅ REFRESHED TOKEN WORKING');
          return tokens.accessToken;
        }
      }
    } catch (error) {
      console.log('❌ Token refresh failed:', error.response?.data || error.message);
    }
    return null;
  }

  // Test if token works
  async testToken(token) {
    try {
      const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Token test successful');
        return true;
      }
    } catch (error) {
      console.log('❌ Token test failed:', error.response?.data?.code || error.message);
    }
    return false;
  }

  // Get working token
  async getWorkingToken() {
    const stored = this.loadTokens();
    
    if (stored?.accessToken) {
      const works = await this.testToken(stored.accessToken);
      if (works) {
        console.log('✅ Existing token works');
        return stored.accessToken;
      }
    }

    // Try refresh
    const refreshed = await this.refreshToken();
    if (refreshed) return refreshed;

    console.log('❌ No working token available');
    return null;
  }

  saveTokens(tokens) {
    fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
  }

  loadTokens() {
    try {
      return JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
    } catch {
      return null;
    }
  }
}

module.exports = SimpleZohoTokenManager;

// If run directly
if (require.main === module) {
  const manager = new SimpleZohoTokenManager();
  
  // Use the provided auth code
  const authCode = '1000.b6a8caeec3a05f440042c1387c4c5a0e.fcb5cc76aa1dae3ea969ba957879ae86';
  
  manager.generateFromAuthCode(authCode).then(token => {
    if (token) {
      console.log('\n🎉 ZOHO API READY');
      console.log('Token length:', token.length);
      console.log('Use manager.getWorkingToken() in your app');
    } else {
      console.log('\n❌ Failed to get working token');
    }
  });
}