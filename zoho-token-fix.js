const express = require('express');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_WEBSERVICES_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';

// Generate authorization URL
app.get('/auth', (req, res) => {
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
    `scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  
  console.log('🔗 Authorization URL generated:');
  console.log(authUrl);
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Copy the URL above');
  console.log('2. Paste it in your browser');
  console.log('3. Authorize the application');
  console.log('4. You will be redirected to localhost:3001/callback');
  console.log('5. The system will generate fresh tokens automatically');
  
  res.json({
    authUrl: authUrl,
    instructions: 'Visit the authUrl to authorize and get fresh tokens'
  });
});

// Handle callback and generate tokens
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' });
  }
  
  try {
    console.log('📤 Exchanging authorization code for tokens...');
    
    const tokenData = querystring.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code
    });
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokens = response.data;
    
    if (tokens.access_token) {
      console.log('✅ Fresh tokens generated successfully!');
      console.log('Access Token:', tokens.access_token);
      console.log('Refresh Token:', tokens.refresh_token);
      console.log('Expires in:', tokens.expires_in, 'seconds');
      
      // Test the token
      const testResponse = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token test successful! Status:', testResponse.status);
      
      // Save tokens to environment file
      const fs = require('fs');
      const envContent = `
# Updated Zoho Webservices Tokens - ${new Date().toISOString()}
ZOHO_WEBSERVICES_ACCESS_TOKEN=${tokens.access_token}
ZOHO_WEBSERVICES_REFRESH_TOKEN=${tokens.refresh_token}
`;
      
      fs.writeFileSync('/tmp/new-zoho-tokens.env', envContent);
      
      res.json({
        success: true,
        message: 'Tokens generated and tested successfully!',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in
        }
      });
      
    } else {
      console.error('❌ Token generation failed:', tokens);
      res.status(400).json({ error: 'Token generation failed', details: tokens });
    }
    
  } catch (error) {
    console.error('❌ Token exchange error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed', details: error.response?.data });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Zoho Token Fix Server running on http://localhost:${PORT}`);
  console.log(`📋 Visit http://localhost:${PORT}/auth to start authorization`);
});