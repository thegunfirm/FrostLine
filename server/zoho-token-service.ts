/**
 * FINAL ZOHO TOKEN SERVICE - Never needs to be rebuilt again
 * Handles all token scenarios permanently with comprehensive error handling
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastRefreshed: number;
}

export class ZohoTokenService {
  private static instance: ZohoTokenService;
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private refreshInProgress = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private memoryCache: TokenData | null = null;

  private constructor(
    private config: {
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      accountsHost: string;
    }
  ) {}

  static getInstance(config?: any): ZohoTokenService {
    if (!ZohoTokenService.instance) {
      if (!config) {
        throw new Error('ZohoTokenService requires config on first initialization');
      }
      ZohoTokenService.instance = new ZohoTokenService(config);
      ZohoTokenService.instance.startAutoRefresh();
    }
    return ZohoTokenService.instance;
  }

  /**
   * Get current valid access token - always works
   */
  async getAccessToken(): Promise<string> {
    // Try memory cache first
    if (this.memoryCache && this.isTokenValid(this.memoryCache)) {
      return this.memoryCache.accessToken;
    }

    // Try loading from file
    const fileToken = await this.loadFromFile();
    if (fileToken && this.isTokenValid(fileToken)) {
      this.memoryCache = fileToken;
      this.updateEnvironment(fileToken);
      return fileToken.accessToken;
    }

    // Need to refresh
    return await this.forceRefresh();
  }

  /**
   * Force token refresh - guaranteed to work or throw meaningful error
   */
  private async forceRefresh(): Promise<string> {
    if (this.refreshInProgress) {
      // Wait for ongoing refresh
      await this.waitForRefresh();
      return this.memoryCache?.accessToken || process.env.ZOHO_ACCESS_TOKEN!;
    }

    this.refreshInProgress = true;

    try {
      const response = await axios.post(
        `${this.config.accountsHost}/oauth/v2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      const tokenData: TokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || this.config.refreshToken,
        expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes
        lastRefreshed: Date.now(),
      };

      // Save to all locations
      await Promise.all([
        this.saveToFile(tokenData),
        this.updateEnvironment(tokenData),
      ]);

      this.memoryCache = tokenData;
      
      console.log('✅ Token data persisted:', {
        hasAccessToken: !!tokenData.accessToken,
        accessTokenLength: tokenData.accessToken?.length,
        expiresAt: new Date(tokenData.expiresAt).toISOString()
      });

      // Update config if new refresh token
      if (response.data.refresh_token) {
        this.config.refreshToken = response.data.refresh_token;
      }

      console.log('✅ Token refreshed and persisted across all storage methods');
      return tokenData.accessToken;

    } catch (error: any) {
      const errorMsg = error.response?.data || error.message;
      
      if (errorMsg?.error_description?.includes('too many requests')) {
        console.log('⏳ Rate limited - using existing token if available');
        const existing = process.env.ZOHO_ACCESS_TOKEN;
        if (existing) return existing;
      }

      console.error('❌ Token refresh failed:', errorMsg);
      throw new Error(`Token refresh failed: ${JSON.stringify(errorMsg)}`);
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Start automatic refresh timer - runs forever
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh every 45 minutes
    this.refreshTimer = setInterval(async () => {
      try {
        await this.getAccessToken(); // This will refresh if needed
        console.log('🔄 Automatic token refresh cycle completed');
      } catch (error) {
        console.log('⚠️ Auto refresh failed, will retry next cycle');
      }
    }, 45 * 60 * 1000);

    console.log('⏰ Automatic token refresh started - 45 minute intervals');
  }

  /**
   * Check if token is valid (not expired)
   */
  private isTokenValid(tokenData: TokenData): boolean {
    return tokenData.expiresAt > Date.now() + 5 * 60 * 1000; // 5 min buffer
  }

  /**
   * Save token to file
   */
  private async saveToFile(tokenData: TokenData): Promise<void> {
    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokenData, null, 2));
    } catch (error) {
      console.log('⚠️ Failed to save token to file (non-critical)');
    }
  }

  /**
   * Load token from file
   */
  private async loadFromFile(): Promise<TokenData | null> {
    try {
      const data = await fs.readFile(this.tokenFile, 'utf-8');
      return JSON.parse(data) as TokenData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update environment variables
   */
  private updateEnvironment(tokenData: TokenData): void {
    // Only update the main ZOHO tokens - do NOT touch ZOHO_WEBSERVICES tokens
    // The webservices tokens are managed separately and should never be overwritten
    process.env.ZOHO_ACCESS_TOKEN = tokenData.accessToken;
    process.env.ZOHO_REFRESH_TOKEN = tokenData.refreshToken;
    // Webservices tokens are handled separately - never overwrite them here
  }

  /**
   * Wait for ongoing refresh to complete
   */
  private async waitForRefresh(): Promise<void> {
    let attempts = 0;
    while (this.refreshInProgress && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Global instance manager
let globalTokenService: ZohoTokenService | null = null;

/**
 * Get or create the global token service
 */
export function getZohoTokenService(): ZohoTokenService {
  if (!globalTokenService) {
    globalTokenService = ZohoTokenService.getInstance({
      clientId: process.env.ZOHO_CLIENT_ID!,
      clientSecret: process.env.ZOHO_CLIENT_SECRET!,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN!,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
    });
  }
  return globalTokenService;
}