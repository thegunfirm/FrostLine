/**
 * Token Persistence Manager
 * Fixes the "Why do we have to do this everyday!?!?" problem permanently
 */

import fs from 'fs/promises';
import path from 'path';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastRefresh: number;
}

class TokenPersistenceManager {
  private static instance: TokenPersistenceManager;
  private tokenCache: TokenData | null = null;
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');

  private constructor() {}

  static getInstance(): TokenPersistenceManager {
    if (!TokenPersistenceManager.instance) {
      TokenPersistenceManager.instance = new TokenPersistenceManager();
    }
    return TokenPersistenceManager.instance;
  }

  /**
   * Save tokens to both file and memory cache
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    const now = Date.now();
    const tokenData: TokenData = {
      accessToken,
      refreshToken,
      expiresAt: now + (55 * 60 * 1000), // 55 minutes from now
      lastRefresh: now
    };

    // Update memory cache immediately
    this.tokenCache = tokenData;

    // Update environment variables for immediate use
    process.env.ZOHO_ACCESS_TOKEN = accessToken;
    process.env.ZOHO_REFRESH_TOKEN = refreshToken;

    // Persist to file for server restarts
    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokenData, null, 2));
      console.log('💾 Tokens saved to persistent storage');
    } catch (error) {
      console.error('⚠️ Failed to save tokens to file:', error);
    }
  }

  /**
   * Load tokens from file or environment
   */
  async loadTokens(): Promise<TokenData | null> {
    // First try memory cache
    if (this.tokenCache) {
      return this.tokenCache;
    }

    // Try loading from file
    try {
      const data = await fs.readFile(this.tokenFile, 'utf-8');
      const tokenData = JSON.parse(data) as TokenData;
      
      // Check if tokens are still valid (not expired)
      if (tokenData.expiresAt > Date.now()) {
        this.tokenCache = tokenData;
        
        // Update environment variables
        process.env.ZOHO_ACCESS_TOKEN = tokenData.accessToken;
        process.env.ZOHO_REFRESH_TOKEN = tokenData.refreshToken;
        
        console.log('📂 Tokens loaded from persistent storage');
        return tokenData;
      } else {
        console.log('⏰ Stored tokens are expired, will refresh');
      }
    } catch (error) {
      console.log('📂 No stored tokens found, will use environment variables');
    }

    // Fallback to environment variables
    if (process.env.ZOHO_ACCESS_TOKEN && process.env.ZOHO_REFRESH_TOKEN) {
      const envTokenData: TokenData = {
        accessToken: process.env.ZOHO_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN,
        expiresAt: 0, // Will need refresh
        lastRefresh: 0
      };
      
      this.tokenCache = envTokenData;
      return envTokenData;
    }

    return null;
  }

  /**
   * Get current valid access token
   */
  async getCurrentAccessToken(): Promise<string | null> {
    const tokenData = await this.loadTokens();
    if (!tokenData) return null;

    // Check if token needs refresh (within 5 minutes of expiry)
    if (tokenData.expiresAt > 0 && tokenData.expiresAt - Date.now() < 5 * 60 * 1000) {
      console.log('🔄 Token needs refresh soon');
      return null; // Force refresh
    }

    return tokenData.accessToken;
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    this.tokenCache = null;
    try {
      await fs.unlink(this.tokenFile);
      console.log('🗑️ Token storage cleared');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }
}

export const tokenPersistence = TokenPersistenceManager.getInstance();