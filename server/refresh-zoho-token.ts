// Script to refresh Zoho OAuth token
const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;

async function refreshZohoToken() {
  console.log('🔄 Refreshing Zoho OAuth token...');
  
  if (!refreshToken || !clientId || !clientSecret) {
    console.error('❌ Missing required environment variables for token refresh');
    console.log('Required: ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET');
    return;
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token'
  });

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const result = await response.json();

    if (response.ok && result.access_token) {
      console.log('✅ Token refreshed successfully');
      console.log('📝 New access token (add to environment):');
      console.log(`ZOHO_ACCESS_TOKEN=${result.access_token}`);
      console.log('\n⏰ Token expires in:', result.expires_in, 'seconds');
      console.log('🔁 Refresh token valid until:', new Date(Date.now() + (result.expires_in * 1000)).toISOString());
    } else {
      console.error('❌ Token refresh failed:', result);
    }
  } catch (error) {
    console.error('💥 Error refreshing token:', error);
  }
}

refreshZohoToken();