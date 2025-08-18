/**
 * Zoho Token Manager - Handles automatic token refresh to prevent daily expiration
 * This eliminates the "Why do we have to do this everyday!?!?" problem
 */

import { ZohoService } from './zoho-service.js';

class ZohoTokenManager {
  private static instance: ZohoTokenManager;
  private zohoService?: ZohoService;
  private refreshTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ZohoTokenManager {
    if (!ZohoTokenManager.instance) {
      ZohoTokenManager.instance = new ZohoTokenManager();
    }
    return ZohoTokenManager.instance;
  }

  initialize() {
    if (this.isInitialized) {
      console.log('✅ Zoho Token Manager already initialized');
      return;
    }

    try {
      this.zohoService = new ZohoService({
        clientId: process.env.ZOHO_CLIENT_ID!,
        clientSecret: process.env.ZOHO_CLIENT_SECRET!,
        redirectUri: process.env.ZOHO_REDIRECT_URI!,
        accountsHost: process.env.ZOHO_ACCOUNTS_HOST!,
        apiHost: process.env.ZOHO_CRM_BASE!,
        accessToken: process.env.ZOHO_ACCESS_TOKEN,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN
      });

      this.startAutoRefresh();
      this.isInitialized = true;
      
      console.log('🚀 Zoho Token Manager initialized - no more daily token expiration!');
      console.log('⏰ Automatic refresh will occur every 50 minutes');
    } catch (error) {
      console.error('❌ Failed to initialize Zoho Token Manager:', error);
    }
  }

  private startAutoRefresh() {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh immediately if token is close to expiry
    this.performTokenRefresh();

    // Set up automatic refresh every 50 minutes (Zoho tokens expire in 60 minutes)
    this.refreshTimer = setInterval(() => {
      this.performTokenRefresh();
    }, 50 * 60 * 1000); // 50 minutes

    console.log('⏰ Automatic token refresh scheduled every 50 minutes');
  }

  private async performTokenRefresh() {
    try {
      if (!this.zohoService) {
        console.log('⚠️ ZohoService not initialized for token refresh');
        return;
      }

      const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
      if (!refreshToken) {
        console.log('⚠️ No refresh token available for automatic refresh');
        return;
      }

      console.log('🔄 Performing automatic Zoho token refresh...');
      await this.zohoService.refreshAccessToken();
      console.log('✅ Automatic token refresh completed successfully');
      
    } catch (error: any) {
      if (error.message?.includes('Rate limited')) {
        console.log('⏳ Token refresh rate limited - will retry in next cycle');
      } else {
        console.error('❌ Automatic token refresh failed:', error);
      }
      // Don't stop the timer, keep trying
    }
  }

  getZohoService(): ZohoService | undefined {
    return this.zohoService;
  }

  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    if (this.zohoService) {
      this.zohoService.stopAutoTokenRefresh();
    }
    this.isInitialized = false;
    console.log('🛑 Zoho Token Manager cleanup completed');
  }
}

// Export singleton instance
export const zohoTokenManager = ZohoTokenManager.getInstance();