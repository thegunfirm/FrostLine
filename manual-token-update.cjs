const fs = require('fs');

// Get fresh token from Zoho
async function updateToken() {
  console.log('🔄 Getting fresh token from Zoho...');
  
  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
        client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
      })
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      console.log('✅ Got fresh token:', data.access_token.substring(0, 20) + '...');
      
      // Update environment
      process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = data.access_token;
      
      // Test the token
      const testResponse = await fetch('https://www.zohoapis.com/crm/v2/Products?per_page=1', {
        headers: { 'Authorization': 'Zoho-oauthtoken ' + data.access_token }
      });
      
      const testData = await testResponse.json();
      
      if (testData.data) {
        console.log('✅ TOKEN WORKS! API responding properly');
        console.log('📊 Found products in Zoho, integration ready');
        return data.access_token;
      } else {
        console.log('❌ Token test failed:', testData);
      }
    } else {
      console.log('❌ No access token received:', data);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

updateToken().catch(console.error);