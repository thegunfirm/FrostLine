// Create a permanent auto-refresh system that updates environment variables
console.log('🔧 Setting up PERMANENT auto-refresh system...');

let refreshing = false;

async function refreshToken() {
  if (refreshing) {
    console.log('⏳ Refresh already in progress...');
    return;
  }
  
  refreshing = true;
  
  try {
    console.log('🔄 Getting fresh token from Zoho...');
    
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
      // Update environment variable IMMEDIATELY
      process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = data.access_token;
      
      console.log('✅ Token refreshed and environment updated');
      console.log('🔗 New token length:', data.access_token.length);
      
      // Test the token works
      const testResponse = await fetch('https://www.zohoapis.com/crm/v2/Products?per_page=1', {
        headers: { 'Authorization': 'Zoho-oauthtoken ' + data.access_token }
      });
      
      const testData = await testResponse.json();
      
      if (testData.data) {
        console.log('✅ TOKEN VERIFIED - API working properly');
        return true;
      } else {
        console.log('❌ Token test failed');
        return false;
      }
    }
  } catch (error) {
    console.log('❌ Refresh error:', error.message);
    return false;
  } finally {
    refreshing = false;
  }
}

// Run initial refresh
refreshToken().then(success => {
  if (success) {
    console.log('🎯 Auto-refresh system is now active');
    
    // Set up automatic refresh every 50 minutes
    setInterval(() => {
      console.log('⏰ Scheduled token refresh starting...');
      refreshToken();
    }, 50 * 60 * 1000);
    
    console.log('🔄 Will auto-refresh every 50 minutes');
  } else {
    console.log('❌ Initial refresh failed');
  }
}).catch(console.error);