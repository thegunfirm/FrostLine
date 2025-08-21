import express from 'express';
import { ZohoService } from './zoho-service';
import { AutomaticZohoTokenManager } from './services/automatic-zoho-token-manager';

const router = express.Router();

// Emergency token recovery service
class EmergencyTokenRecovery {
  private tokenManager: AutomaticZohoTokenManager;
  
  constructor() {
    this.tokenManager = new AutomaticZohoTokenManager();
  }

  // Generate emergency re-authorization URL
  generateEmergencyAuthUrl(): string {
    const clientId = process.env.ZOHO_WEBSERVICES_CLIENT_ID;
    const redirectUri = `${process.env.REPLIT_DEV_DOMAIN || 'https://thegunfirm.com'}/api/zoho/emergency-callback`;
    const state = `emergency_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
      `scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;
    
    return authUrl;
  }

  // Process emergency callback and capture new tokens
  async processEmergencyCallback(authCode: string): Promise<{success: boolean, message: string}> {
    try {
      const newAccessToken = await this.tokenManager.generateFromAuthCode(authCode);
      
      if (newAccessToken) {
        // Test the new token immediately
        const isValid = await this.testNewToken(newAccessToken);
        
        if (isValid) {
          console.log('🆘 Emergency token recovery completed successfully');
          return {
            success: true,
            message: 'Emergency token recovery completed. All Zoho services restored.'
          };
        } else {
          return {
            success: false,
            message: 'New token generated but validation failed'
          };
        }
      } else {
        return {
          success: false,
          message: 'Failed to generate new access token from authorization code'
        };
      }
    } catch (error: any) {
      console.error('🆘 Emergency token recovery failed:', error);
      return {
        success: false,
        message: `Emergency recovery failed: ${error.message}`
      };
    }
  }

  // Test new token functionality
  private async testNewToken(token: string): Promise<boolean> {
    try {
      const axios = require('axios');
      const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Check current token health status
  async checkTokenHealth(): Promise<{healthy: boolean, details: any}> {
    try {
      const currentToken = await this.tokenManager.getValidToken();
      
      if (!currentToken) {
        return {
          healthy: false,
          details: {
            status: 'no_token',
            message: 'No valid access token available',
            action_required: 'Emergency re-authorization needed'
          }
        };
      }

      const isValid = await this.testNewToken(currentToken);
      
      return {
        healthy: isValid,
        details: {
          status: isValid ? 'healthy' : 'invalid',
          has_token: true,
          token_works: isValid,
          last_test: new Date().toISOString(),
          action_required: isValid ? 'none' : 'Token refresh or re-authorization needed'
        }
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          status: 'error',
          error: error.message,
          action_required: 'Investigation required'
        }
      };
    }
  }
}

const emergencyRecovery = new EmergencyTokenRecovery();

// Admin-only middleware for emergency operations
const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Add your admin authentication logic here
  // For now, using a simple emergency key check
  const emergencyKey = req.headers['x-emergency-key'] || req.query.emergency_key;
  const validKey = process.env.EMERGENCY_ADMIN_KEY || 'emergency-2025-recovery';
  
  if (emergencyKey !== validKey) {
    return res.status(401).json({
      error: 'Unauthorized: Emergency admin access required',
      hint: 'Include X-Emergency-Key header or emergency_key query parameter'
    });
  }
  
  next();
};

// Emergency token health check (can be used for monitoring)
router.get('/zoho/emergency/health', async (req, res) => {
  try {
    const health = await emergencyRecovery.checkTokenHealth();
    
    res.json({
      timestamp: new Date().toISOString(),
      service: 'zoho_token_health',
      ...health
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Emergency re-authorization URL generator (admin only)
router.get('/zoho/emergency/reauth', requireAdminAuth, (req, res) => {
  try {
    const authUrl = emergencyRecovery.generateEmergencyAuthUrl();
    
    console.log('🆘 Emergency re-authorization URL generated');
    
    res.json({
      success: true,
      message: 'Emergency re-authorization URL generated',
      auth_url: authUrl,
      instructions: [
        '1. Click the auth_url to authorize Zoho access',
        '2. Complete the OAuth flow in your browser',
        '3. The system will automatically capture new tokens',
        '4. All Zoho services will resume operation'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to generate emergency auth URL',
      message: error.message
    });
  }
});

// Emergency callback handler (processes new tokens)
router.get('/zoho/emergency-callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.status(400).send(`
        <html><body>
          <h1>❌ Emergency Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p>Please contact your system administrator.</p>
        </body></html>
      `);
    }
    
    if (!code) {
      return res.status(400).send(`
        <html><body>
          <h1>❌ No Authorization Code</h1>
          <p>The OAuth flow did not return an authorization code.</p>
          <p>Please try the re-authorization process again.</p>
        </body></html>
      `);
    }
    
    console.log('🆘 Processing emergency authorization callback...');
    
    const result = await emergencyRecovery.processEmergencyCallback(code as string);
    
    if (result.success) {
      res.send(`
        <html><body>
          <h1>✅ Emergency Token Recovery Successful!</h1>
          <p>${result.message}</p>
          <p><strong>Status:</strong> All Zoho services restored</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>You can now close this window. The system is fully operational.</p>
        </body></html>
      `);
    } else {
      res.status(500).send(`
        <html><body>
          <h1>❌ Emergency Token Recovery Failed</h1>
          <p>${result.message}</p>
          <p>Please contact your system administrator for manual intervention.</p>
        </body></html>
      `);
    }
  } catch (error: any) {
    console.error('🆘 Emergency callback processing failed:', error);
    res.status(500).send(`
      <html><body>
        <h1>❌ Emergency Recovery Error</h1>
        <p>An unexpected error occurred during token recovery.</p>
        <p>Error: ${error.message}</p>
      </body></html>
    `);
  }
});

// Manual token override (admin only, for extreme emergencies)
router.post('/zoho/emergency/manual-override', requireAdminAuth, async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token || !refresh_token) {
      return res.status(400).json({
        error: 'Both access_token and refresh_token are required'
      });
    }
    
    // Update environment variables
    process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = access_token;
    process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN = refresh_token;
    
    // Test the manually provided token
    const isValid = await emergencyRecovery.checkTokenHealth();
    
    console.log('🆘 Manual token override attempted');
    
    res.json({
      success: true,
      message: 'Manual token override completed',
      token_valid: isValid.healthy,
      details: isValid.details,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Manual override failed',
      message: error.message
    });
  }
});

export default router;