const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function generateFreshTokens() {
  const clientId = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
  const clientSecret = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET;
  
  console.log('🔄 Generating fresh Zoho tokens for tech@thegunfirm.com');
  console.log('');
  console.log('STEP 1: Visit this URL to authorize the application:');
  console.log('');
  console.log(`https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${clientId}&scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&access_type=offline`);
  console.log('');
  console.log('STEP 2: After authorization, copy the authorization code from the callback URL');
  console.log('');
  
  rl.question('Enter the authorization code: ', async (authCode) => {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token } = response.data;
      
      console.log('✅ Successfully generated fresh tokens!');
      console.log('');
      console.log('📋 UPDATE THESE SECRET VALUES IN REPLIT:');
      console.log('');
      console.log('ZOHO_WEBSERVICES_ACCESS_TOKEN =', access_token);
      console.log('ZOHO_WEBSERVICES_REFRESH_TOKEN =', refresh_token);
      console.log('');
      
      // Test the new token
      const testResponse = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token test successful! Can access Deals module');
      
    } catch (error) {
      console.error('❌ Token generation failed:', error.response?.data || error.message);
    } finally {
      rl.close();
    }
  });
}

generateFreshTokens();