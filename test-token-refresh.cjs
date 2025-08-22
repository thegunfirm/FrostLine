#!/usr/bin/env node

// Manually load environment variables from .env file
const fs = require('fs');
const path = require('path');

try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.log('No .env file found, using system environment variables');
}

async function testTokenRefresh() {
  console.log('🔄 Testing automatic token refresh system...');

  try {
    // Import the automatic token manager
    const { AutomaticZohoTokenManager } = await import('./server/services/automatic-zoho-token-manager.js');
    const tokenManager = new AutomaticZohoTokenManager();
    
    console.log('📋 Current environment token preview:', 
      process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN ? 
      process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN.substring(0, 20) + '...' : 
      'NOT SET');
    
    console.log('🔄 Requesting fresh token...');
    const validToken = await tokenManager.ensureValidToken();
    
    if (validToken) {
      console.log('✅ Token refresh successful!');
      console.log('   📏 Token length:', validToken.length);
      console.log('   👀 Token preview:', validToken.substring(0, 20) + '...');
      console.log('   🌍 Environment updated:', process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN ? 'Yes' : 'No');
      
      // Test that we can create a ZohoService with this token
      const { ZohoService } = await import('./server/zoho-service.js');
      const zohoService = new ZohoService({
        clientId: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        redirectUri: process.env.ZOHO_REDIRECT_URI,
        accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
        apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
        accessToken: validToken,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN
      });
      
      console.log('✅ ZohoService created successfully with refreshed token');
      
    } else {
      console.log('❌ Token refresh failed - no valid token returned');
    }
    
  } catch (error) {
    console.log('❌ Token refresh test error:', error.message);
    console.log('📋 Error details:', error);
  }
}

testTokenRefresh().catch(console.error);