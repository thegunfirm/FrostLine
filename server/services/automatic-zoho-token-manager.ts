import axios from 'axios';
import { writeFileSync, readFileSync, existsSync } from 'fs';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastRefresh: number;
}

export class AutomaticZohoTokenManager {
  private tokenFile = '.zoho-tokens.json';
  private clientId = '1000.EYQE8LR8LWDKQ6YD5CKPC9D0885RUN';
  private clientSecret = '8fd49cf545a04ed0a5e1932cee6d56cda5887a1b34';
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutomaticRefresh();
  }

  // Start automatic token refresh every 50 minutes
  private startAutomaticRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh every 50 minutes (tokens expire in 60 minutes)
    this.refreshInterval = setInterval(async () => {
      await this.ensureValidToken();
    }, 50 * 60 * 1000);

    console.log('🔄 Automatic Zoho token refresh started - runs every 50 minutes');
  }

  // Get a valid token, refreshing if necessary
  async getValidToken(): Promise<string | null> {
    const tokenData = this.loadTokens();
    
    if (!tokenData) {
      console.log('❌ No tokens available - need initial authorization');
      return null;
    }

    // Check if token is still valid (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    
    if (tokenData.expiresAt > now + bufferTime) {
      // Token is still valid
      return tokenData.accessToken;
    }

    // Token expired or will expire soon, refresh it
    console.log('🔄 Token expired, refreshing automatically...');
    return await this.refreshToken();
  }

  // Ensure we always have a valid token
  async ensureValidToken(): Promise<string | null> {
    try {
      const token = await this.getValidToken();
      if (token) {
        // Test the token to make sure it works
        const isValid = await this.testToken(token);
        if (isValid) {
          console.log('✅ Zoho token verified and working');
          return token;
        } else {
          console.log('🔄 Token test failed, refreshing...');
          return await this.refreshToken();
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Token management error:', error);
      return null;
    }
  }

  // Refresh the access token using refresh token
  private async refreshToken(): Promise<string | null> {
    const tokenData = this.loadTokens();
    
    if (!tokenData?.refreshToken) {
      console.log('❌ No refresh token available');
      return null;
    }

    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
        new URLSearchParams({
          refresh_token: tokenData.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (response.data.access_token) {
        const updatedTokens: TokenData = {
          ...tokenData,
          accessToken: response.data.access_token,
          expiresAt: Date.now() + (3600 * 1000), // 1 hour from now
          lastRefresh: Date.now()
        };

        this.saveTokens(updatedTokens);
        console.log('✅ Zoho token refreshed successfully');
        
        // Update environment variable for immediate use
        process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = response.data.access_token;
        
        return updatedTokens.accessToken;
      } else {
        console.log('❌ Token refresh failed - no access token received');
        return null;
      }
    } catch (error: any) {
      console.log('❌ Token refresh error:', error.response?.data || error.message);
      return null;
    }
  }

  // Test if a token works
  private async testToken(token: string): Promise<boolean> {
    try {
      const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Generate initial tokens from authorization code
  async generateFromAuthCode(authCode: string): Promise<string | null> {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', 
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: authCode,
          grant_type: 'authorization_code'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (response.data.access_token && response.data.refresh_token) {
        const tokens: TokenData = {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt: Date.now() + (3600 * 1000),
          lastRefresh: Date.now()
        };

        this.saveTokens(tokens);
        
        // Update environment variables
        process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN = tokens.accessToken;
        process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN = tokens.refreshToken;
        
        console.log('✅ Initial Zoho tokens generated and saved');
        return tokens.accessToken;
      }
    } catch (error: any) {
      console.log('❌ Token generation failed:', error.response?.data || error.message);
    }
    return null;
  }

  // Load tokens from file or environment variables
  private loadTokens(): TokenData | null {
    try {
      // First try to load from file
      if (existsSync(this.tokenFile)) {
        const data = readFileSync(this.tokenFile, 'utf8');
        return JSON.parse(data);
      }
      
      // If no file exists, try to load from environment variables
      const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
      const refreshToken = process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN;
      
      if (accessToken && refreshToken) {
        console.log('📋 Loading tokens from environment variables');
        const tokens: TokenData = {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + (3600 * 1000), // Assume expires in 1 hour
          lastRefresh: Date.now()
        };
        
        // Save to file for future use
        this.saveTokens(tokens);
        return tokens;
      }
      
      return null;
    } catch (error) {
      console.log('❌ Failed to load tokens:', error);
      return null;
    }
  }

  // Save tokens to file
  private saveTokens(tokens: TokenData): void {
    try {
      writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('❌ Failed to save tokens:', error);
    }
  }

  // Clean up intervals
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Export singleton instance
export const automaticZohoTokenManager = new AutomaticZohoTokenManager();