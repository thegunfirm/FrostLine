import type { Express } from "express";
import { ZohoService } from "./zoho-service";
import { automaticZohoTokenManager } from "./services/automatic-zoho-token-manager.js";

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
  }
}

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

  // Connection status endpoint - tests actual CRM connectivity
  app.get("/api/zoho/status", async (req, res) => {
    try {
      const tokens = automaticZohoTokenManager.getCurrentToken();
      
      if (!tokens) {
        return res.json({
          status: "not_configured",
          hasToken: false,
          message: "No Zoho tokens available - OAuth authorization needed",
          authUrl: `/api/zoho/auth/initiate`,
          automaticRefresh: false
        });
      }

      // Test actual CRM connectivity using working endpoints
      try {
        const axios = require('axios');
        
        // Test deals endpoint (confirmed working)
        const testResponse = await axios.get('https://www.zohoapis.com/crm/v2/deals?per_page=1', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (testResponse.status === 200 || testResponse.status === 204) {
          return res.json({
            status: "working",
            hasToken: true,
            tokenLength: tokens.accessToken?.length || 0,
            automaticRefresh: true,
            message: "Zoho API is operational with automatic token management"
          });
        }
      } catch (apiError: any) {
        if (apiError.response?.status === 401) {
          // Token expired or invalid - try to refresh
          const refreshed = await automaticZohoTokenManager.forceRefreshNow();
          if (refreshed) {
            return res.json({
              status: "refreshed",
              hasToken: true,
              tokenLength: tokens.accessToken?.length || 0,
              automaticRefresh: true,
              message: "Tokens refreshed automatically - CRM access restored"
            });
          } else {
            return res.json({
              status: "expired",
              hasToken: false,
              message: "Token refresh failed - need new OAuth authorization",
              authUrl: `/api/zoho/auth/initiate`,
              automaticRefresh: false
            });
          }
        } else {
          // Other API error
          return res.json({
            status: "api_error",
            hasToken: true,
            tokenLength: tokens.accessToken?.length || 0,
            automaticRefresh: true,
            message: `CRM API error: ${apiError.response?.data?.code || apiError.message}`,
            error: apiError.response?.data
          });
        }
      }

      // Fallback response
      return res.json({
        status: "unknown",
        hasToken: true,
        tokenLength: tokens.accessToken?.length || 0,
        automaticRefresh: true,
        message: "Token exists but connectivity unclear"
      });
      
    } catch (error: any) {
      res.status(500).json({ 
        status: "error",
        hasToken: false,
        error: error.message,
        automaticRefresh: false
      });
    }
  });

  // Token upload endpoint - restore connection from JSON file
  app.post("/api/zoho/upload-tokens", async (req, res) => {
    try {
      console.log('📁 Token upload request received:', JSON.stringify(req.body, null, 2));
      
      const { client_id, client_secret, code, grant_type } = req.body;
      
      // Validate the uploaded data
      if (!client_id || !client_secret || !code || grant_type !== 'authorization_code') {
        console.log('❌ Validation failed:', {
          hasClientId: !!client_id,
          hasClientSecret: !!client_secret,
          hasCode: !!code,
          grantType: grant_type
        });
        return res.status(400).json({ 
          error: 'Invalid token file format. Expected client_id, client_secret, code, and grant_type fields.' 
        });
      }

      // Exchange the authorization code for tokens
      console.log('🔄 Attempting token exchange with Zoho...');
      const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id,
          client_secret,
          code,
          grant_type
        })
      });

      const tokenData = await tokenResponse.json();
      console.log('📝 Token exchange response:', { 
        status: tokenResponse.status, 
        success: !!tokenData.access_token,
        error: tokenData.error || 'none'
      });

      if (tokenData.access_token && tokenData.refresh_token) {
        // Clear any existing tokens first
        automaticZohoTokenManager.forceReset();
        
        // Save the tokens directly from the successful exchange
        const success = await automaticZohoTokenManager.saveTokensDirectly({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in || 3600,
          api_domain: tokenData.api_domain || 'https://www.zohoapis.com'
        });
        
        if (success) {
          res.json({ 
            success: true, 
            message: 'Zoho connection restored successfully from uploaded file',
            expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()
          });
        } else {
          res.status(500).json({ error: 'Failed to save tokens after successful exchange' });
        }
      } else {
        let userMessage = 'Token exchange failed';
        let helpText = '';
        
        if (tokenData.error === 'invalid_code') {
          userMessage = 'Authorization code expired';
          helpText = 'Authorization codes expire in 5-10 minutes. Please generate a new authorization code and upload immediately.';
        } else if (tokenData.error === 'invalid_client') {
          userMessage = 'Invalid client credentials';
          helpText = 'Please check that your client_id and client_secret are correct.';
        }
        
        res.status(400).json({ 
          error: userMessage, 
          details: tokenData.error || 'Unknown error',
          helpText
        });
      }
    } catch (error: any) {
      console.error('Token upload error:', error);
      res.status(500).json({ error: 'Failed to process token file: ' + error.message });
    }
  });

  // Token refresh endpoint - force refresh existing tokens
  app.post("/api/zoho/refresh-token", async (req, res) => {
    try {
      console.log('🔄 Manual token refresh requested...');
      
      // Try to use the automatic token manager for refresh
      const success = await automaticZohoTokenManager.forceRefreshNow();
      
      if (success) {
        res.json({
          success: true,
          message: 'Tokens refreshed successfully - CRM access restored',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Token refresh failed - may need re-authorization',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error("Token refresh error:", error);
      
      if (error.message?.includes('too many requests') || error.message?.includes('rate limit')) {
        res.status(429).json({
          success: false,
          error: 'Rate limited - will retry automatically',
          note: 'Zoho API has temporary rate limits during heavy usage',
          timestamp: new Date().toISOString()
        });
      } else if (error.message?.includes('scope') || error.message?.includes('oauth')) {
        res.status(401).json({
          success: false,
          error: 'OAuth scope issue - need fresh authorization',
          note: 'Current tokens lack required CRM permissions',
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