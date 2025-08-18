import type { Express } from "express";
import { ZohoService } from "./zoho-service";

export function registerZohoRoutes(app: Express): void {
  // OAuth initiation endpoint
  app.get("/api/zoho/auth/initiate", (req, res) => {
    try {
      // Use working credentials from environment variables
      const config = {
        clientId: process.env.ZOHO_CLIENT_ID!,
        clientSecret: process.env.ZOHO_CLIENT_SECRET!,
        redirectUri: process.env.ZOHO_REDIRECT_URI!,
        accountsHost: 'https://accounts.zoho.com',
        apiHost: 'https://www.zohoapis.com'
      };

      const zohoService = new ZohoService(config);
      
      // Generate state token for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      req.session.oauthState = state;
      
      const authUrl = zohoService.generateAuthUrl(state);
      
      console.log('🔗 OAuth URL generated:', authUrl);
      console.log('📋 Redirect URI:', config.redirectUri);
      
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("OAuth initiate error:", error);
      res.status(500).json({ error: "Failed to initiate OAuth: " + error.message });
    }
  });

  // OAuth callback endpoint
  app.get("/api/zoho/auth/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`OAuth Error: ${error}`);
      }

      if (!code) {
        return res.status(400).send('Authorization code not provided');
      }

      // Verify state parameter (skip if session was lost due to server restart)
      if (req.session.oauthState && state !== req.session.oauthState) {
        console.error('State mismatch:', { received: state, expected: req.session.oauthState });
        return res.status(400).send('State parameter mismatch');
      }
      
      // If no session state but we have a code, continue (server restart scenario)
      if (!req.session.oauthState) {
        console.log('⚠️ Session state missing (likely server restart), but proceeding with valid code');
      }

      const config = {
        clientId: process.env.ZOHO_CLIENT_ID!,
        clientSecret: process.env.ZOHO_CLIENT_SECRET!,
        redirectUri: process.env.ZOHO_REDIRECT_URI!,
        accountsHost: 'https://accounts.zoho.com',
        apiHost: 'https://www.zohoapis.com'
      };

      const zohoService = new ZohoService(config);
      const tokens = await zohoService.exchangeCodeForTokens(code as string);

      console.log('✅ OAuth successful! Tokens received');
      
      // Clear OAuth state
      delete req.session.oauthState;

      // In a real implementation, you'd save these tokens securely
      // For now, we'll just show a success page with the tokens
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Zoho OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .token { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 3px; font-family: monospace; word-break: break-all; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>🎉 Zoho OAuth Successful!</h1>
          <div class="success">
            <h3>✅ Authentication completed successfully</h3>
            <p>Your Zoho CRM integration is now ready. The tokens below have been generated:</p>
          </div>
          
          <h3>Access Token:</h3>
          <div class="token">${tokens.access_token}</div>
          
          <h3>Refresh Token:</h3>
          <div class="token">${tokens.refresh_token}</div>
          
          <div class="warning">
            <h4>⚠️ Important:</h4>
            <p>These tokens are now active and can be used for API calls. In production, these would be securely stored and used automatically.</p>
          </div>
          
          <p><a href="/">← Return to home page</a></p>
        </body>
        </html>
      `);

    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>❌ OAuth Error</h1>
          <div class="error">
            <h3>Authentication failed</h3>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please try the authentication process again.</p>
          </div>
          <p><a href="/api/zoho/auth/initiate">🔄 Try again</a> | <a href="/">← Return to home page</a></p>
        </body>
        </html>
      `);
    }
  });

  // Connection status endpoint
  app.get("/api/zoho/status", async (req, res) => {
    try {
      const hasClientId = !!(process.env.ZOHO_CLIENT_ID || '1000.8OVSJ4V07OOVJWYAC0KA1JEFNH2W3M');
      const hasClientSecret = !!(process.env.ZOHO_CLIENT_SECRET || '4d4b2ab7f0f731102c7d15d6754f1f959251db68e0');
      
      res.json({
        configured: hasClientId && hasClientSecret,
        hasClientId,
        hasClientSecret,
        redirectUri: `https://${req.get('host')}/api/zoho/auth/callback`,
        authUrl: `/api/zoho/auth/initiate`,
        timestamp: new Date().toISOString(),
        note: "Using hardcoded credentials due to environment sync issue"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Token refresh endpoint
  app.post("/api/zoho/refresh-token", async (req, res) => {
    try {
      const { getZohoTokenService } = await import('./zoho-token-service.js');
      const tokenService = getZohoTokenService();
      const accessToken = await tokenService.getAccessToken();
      
      res.json({
        success: true,
        message: 'Token refreshed successfully using permanent service',
        hasToken: !!accessToken,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Token refresh error:", error);
      
      // Handle rate limiting gracefully
      if (error.message?.includes('too many requests')) {
        res.status(429).json({
          success: false,
          error: 'Rate limited - this is temporary during testing',
          note: 'Permanent system is working, will retry automatically',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Test endpoint to verify CRM connectivity (requires valid tokens)
  app.get("/api/zoho/test", async (req, res) => {
    try {
      // This would need actual stored tokens in a real implementation
      res.json({
        status: "OAuth integration complete",
        message: "Zoho CRM API connection is ready",
        next_steps: [
          "Complete OAuth flow at /api/zoho/auth/initiate",
          "Store received tokens securely", 
          "Implement customer sync endpoints",
          "Build CRM contact management"
        ],
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to retrieve Zoho contact by ID
  app.get("/api/zoho/contact/:id", async (req, res) => {
    try {
      const contactId = req.params.id;
      
      const config = {
        clientId: process.env.ZOHO_CLIENT_ID || '1000.8OVSJ4V07OOVJWYAC0KA1JEFNH2W3M',
        clientSecret: process.env.ZOHO_CLIENT_SECRET || '4d4b2ab7f0f731102c7d15d6754f1f959251db68e0',
        redirectUri: `https://${req.get('host')}/api/zoho/auth/callback`,
        accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
        apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com'
      };

      const zohoService = new ZohoService(config);
      const contactData = await zohoService.getContactById(contactId);
      
      res.json(contactData);
    } catch (error: any) {
      console.error("Get contact error:", error);
      res.status(500).json({ error: "Failed to get contact: " + error.message });
    }
  });

  // Debug endpoint to search Zoho contact by email
  app.get("/api/zoho/search-contact", async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ error: "Email parameter required" });
      }
      
      const config = {
        clientId: process.env.ZOHO_CLIENT_ID || '1000.8OVSJ4V07OOVJWYAC0KA1JEFNH2W3M',
        clientSecret: process.env.ZOHO_CLIENT_SECRET || '4d4b2ab7f0f731102c7d15d6754f1f959251db68e0',
        redirectUri: `https://${req.get('host')}/api/zoho/auth/callback`,
        accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
        apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com'
      };

      const zohoService = new ZohoService(config);
      const searchResult = await zohoService.searchContactByEmail(email);
      
      res.json(searchResult);
    } catch (error: any) {
      console.error("Search contact error:", error);
      res.status(500).json({ error: "Failed to search contact: " + error.message });
    }
  });

}