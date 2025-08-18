import express from 'express';
import { ZohoService } from './zoho-service';

const router = express.Router();

// Initialize Zoho service with webservices credentials for tech@thegunfirm.com
const zohoService = new ZohoService({
  clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID!,
  clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET!,
  redirectUri: "https://thegunfirm.com/api/zoho/callback",
  accountsHost: 'https://accounts.zoho.com',
  apiHost: 'https://www.zohoapis.com',
  accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
  refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
});

// Route to initiate Zoho OAuth for tech@thegunfirm.com
router.get('/zoho/auth', (req, res) => {
  const state = req.sessionID; // Use session ID as state for security
  const authUrl = zohoService.generateAuthUrl(state);
  
  console.log('🔗 Generated Zoho OAuth URL for tech@thegunfirm.com:', authUrl);
  
  // Store state in session for verification
  (req.session as any).zohoState = state;
  
  res.redirect(authUrl);
});

// Route to handle Zoho OAuth callback
router.get('/zoho/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state parameter
    if (state !== (req.session as any).zohoState) {
      console.error('❌ OAuth state mismatch');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.status(400).json({ error: 'No authorization code received' });
    }
    
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Exchange code for tokens
    const tokens = await zohoService.exchangeCodeForTokens(code as string);
    
    console.log('✅ Successfully obtained tokens for tech@thegunfirm.com!');
    console.log('📋 IMPORTANT: Save these tokens as environment variables:');
    console.log('');
    console.log('ZOHO_ACCESS_TOKEN=' + tokens.access_token);
    console.log('ZOHO_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('');
    console.log('🔧 Add these to your Replit secrets to complete the setup.');
    
    // Clear the state from session
    delete (req.session as any).zohoState;
    
    // Return success page
    res.send(`
      <html>
        <head>
          <title>Zoho OAuth Success - tech@thegunfirm.com</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; }
            .token { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; border-radius: 3px; font-family: monospace; margin: 10px 0; }
            .important { color: #856404; background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <h1>✅ Zoho OAuth Setup Complete!</h1>
          <div class="success">
            <p><strong>Successfully authorized tech@thegunfirm.com for Zoho CRM access!</strong></p>
          </div>
          
          <div class="important">
            <h3>🔧 NEXT STEPS - Add these tokens to your Replit secrets:</h3>
          </div>
          
          <h3>Access Token:</h3>
          <div class="token">ZOHO_ACCESS_TOKEN=${tokens.access_token}</div>
          
          <h3>Refresh Token:</h3>
          <div class="token">ZOHO_REFRESH_TOKEN=${tokens.refresh_token}</div>
          
          <div class="important">
            <h3>📌 Instructions:</h3>
            <ol>
              <li>Copy the tokens above</li>
              <li>Go to your Replit project settings</li>
              <li>Add these as environment secrets</li>
              <li>The system will automatically use tech@thegunfirm.com for all API calls</li>
            </ol>
          </div>
          
          <p><a href="/">← Return to TheGunFirm.com</a></p>
        </body>
      </html>
    `);
    
  } catch (error: any) {
    console.error('❌ Zoho OAuth callback error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      details: error.message 
    });
  }
});

// Route to check current Zoho authentication status
router.get('/zoho/status', async (req, res) => {
  try {
    const hasTokens = !!(process.env.ZOHO_ACCESS_TOKEN && process.env.ZOHO_REFRESH_TOKEN);
    
    if (!hasTokens) {
      return res.json({
        authenticated: false,
        message: 'No Zoho tokens found. Use /api/zoho/auth to authenticate.',
        authUrl: '/api/zoho/auth'
      });
    }
    
    // Test the tokens by making a simple API call
    const testService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID!,
      clientSecret: process.env.ZOHO_CLIENT_SECRET!,
      redirectUri: process.env.ZOHO_REDIRECT_URI!,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });
    
    const userInfo = await testService.makeAPIRequest('users?type=CurrentUser', 'GET');
    const currentUser = userInfo?.users?.[0];
    
    res.json({
      authenticated: true,
      user: currentUser?.email || 'Unknown',
      message: `Successfully authenticated as ${currentUser?.email || 'tech@thegunfirm.com'}`,
      clientId: process.env.ZOHO_CLIENT_ID,
      lastRefresh: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Zoho status check error:', error);
    res.json({
      authenticated: false,
      error: error.message,
      message: 'Token validation failed. Re-authentication may be required.',
      authUrl: '/api/zoho/auth'
    });
  }
});

export default router;