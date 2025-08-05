import axios from 'axios';
import { storage } from '../storage';

// FAP API Configuration
const FAP_API_BASE = process.env.FAP_API_BASE || 'https://freeamericanpeople.com/api';
const FAP_API_KEY = process.env.FAP_API_KEY;

interface FAPUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FAPSubscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod: string;
}

export class FAPIntegrationService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = FAP_API_KEY || '';
    this.baseUrl = FAP_API_BASE;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
    if (!this.apiKey) {
      throw new Error('FAP API key not configured');
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      console.error(`FAP API Error (${endpoint}):`, error.response?.data || error.message);
      throw new Error(`FAP API request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // User Synchronization
  async syncUser(userId: string): Promise<void> {
    try {
      const fapUser: FAPUser = await this.makeRequest(`/users/${userId}`);
      
      // Update local user record with FAP data
      await storage.upsertUser({
        id: fapUser.id,
        email: fapUser.email,
        firstName: fapUser.firstName,
        lastName: fapUser.lastName,
        role: fapUser.role,
        subscriptionTier: fapUser.subscriptionTier,
        emailVerified: fapUser.emailVerified,
      });

      // Log the sync activity
      await storage.logUserActivity({
        userId: parseInt(fapUser.id),
        action: 'user_sync_from_fap',
        details: `User data synchronized from FAP platform`,
        ipAddress: 'system',
        userAgent: 'FAP Integration Service'
      });

    } catch (error) {
      console.error(`Failed to sync user ${userId} from FAP:`, error);
      throw error;
    }
  }

  async syncAllUsers(): Promise<void> {
    try {
      const fapUsers: FAPUser[] = await this.makeRequest('/users');
      
      for (const fapUser of fapUsers) {
        await storage.upsertUser({
          id: fapUser.id,
          email: fapUser.email,
          firstName: fapUser.firstName,
          lastName: fapUser.lastName,
          role: fapUser.role,
          subscriptionTier: fapUser.subscriptionTier,
          emailVerified: fapUser.emailVerified,
        });
      }

      console.log(`Synchronized ${fapUsers.length} users from FAP`);
    } catch (error) {
      console.error('Failed to sync all users from FAP:', error);
      throw error;
    }
  }

  // Subscription Management
  async getUserSubscription(userId: string): Promise<FAPSubscription | null> {
    try {
      return await this.makeRequest(`/users/${userId}/subscription`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateSubscriptionStatus(userId: string, status: string): Promise<void> {
    try {
      await this.makeRequest(`/users/${userId}/subscription`, 'PUT', { status });
    } catch (error) {
      console.error(`Failed to update subscription status for user ${userId}:`, error);
      throw error;
    }
  }

  // Cross-Platform Support Tickets
  async createFAPSupportTicket(ticketData: {
    customerId: string;
    subject: string;
    description: string;
    priority: string;
    category: string;
    source: string;
  }): Promise<any> {
    try {
      return await this.makeRequest('/support/tickets', 'POST', {
        ...ticketData,
        source: 'thegunfirm',
      });
    } catch (error) {
      console.error('Failed to create FAP support ticket:', error);
      throw error;
    }
  }

  async getFAPSupportTickets(userId?: string): Promise<any[]> {
    try {
      const endpoint = userId ? `/support/tickets?userId=${userId}` : '/support/tickets';
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Failed to fetch FAP support tickets:', error);
      return [];
    }
  }

  async syncSupportTicket(ticketId: string, updates: any): Promise<void> {
    try {
      await this.makeRequest(`/support/tickets/${ticketId}`, 'PUT', updates);
    } catch (error) {
      console.error(`Failed to sync support ticket ${ticketId} to FAP:`, error);
      throw error;
    }
  }

  // Email Template Synchronization
  async syncEmailTemplate(templateData: {
    templateName: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    category: string;
    variables?: string[];
  }): Promise<void> {
    try {
      await this.makeRequest('/email-templates', 'POST', {
        ...templateData,
        source: 'thegunfirm',
      });
    } catch (error) {
      console.error('Failed to sync email template to FAP:', error);
      throw error;
    }
  }

  async getFAPEmailTemplates(): Promise<any[]> {
    try {
      return await this.makeRequest('/email-templates');
    } catch (error) {
      console.error('Failed to fetch FAP email templates:', error);
      return [];
    }
  }

  // Analytics and Reporting
  async sendAnalyticsData(data: {
    userId?: string;
    event: string;
    properties: Record<string, any>;
    timestamp: Date;
  }): Promise<void> {
    try {
      await this.makeRequest('/analytics/events', 'POST', {
        ...data,
        source: 'thegunfirm',
      });
    } catch (error) {
      console.error('Failed to send analytics data to FAP:', error);
      // Don't throw error for analytics - it's not critical
    }
  }

  async getCrossplatformAnalytics(params: {
    startDate: string;
    endDate: string;
    userId?: string;
    event?: string;
  }): Promise<any> {
    try {
      const queryParams = new URLSearchParams(params as any);
      return await this.makeRequest(`/analytics/cross-platform?${queryParams}`);
    } catch (error) {
      console.error('Failed to fetch cross-platform analytics:', error);
      return null;
    }
  }

  // Authentication Verification
  async verifyFAPSession(sessionToken: string): Promise<FAPUser | null> {
    try {
      return await this.makeRequest('/auth/verify', 'POST', { sessionToken });
    } catch (error: any) {
      if (error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  }

  // Webhook Processing
  async processWebhook(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'user.updated':
          await this.syncUser(data.userId);
          break;
        
        case 'subscription.updated':
          await this.handleSubscriptionUpdate(data);
          break;
        
        case 'support.ticket.created':
          await this.handleCrossPlatformTicket(data);
          break;
        
        default:
          console.log(`Unhandled FAP webhook event: ${eventType}`);
      }
    } catch (error) {
      console.error(`Failed to process FAP webhook ${eventType}:`, error);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(data: any): Promise<void> {
    try {
      // Update local user subscription data
      await storage.updateUserSubscription(data.userId, {
        subscriptionTier: data.tier,
        subscriptionStatus: data.status,
      });

      // Log activity
      await storage.logUserActivity({
        userId: data.userId,
        action: 'subscription_updated_from_fap',
        details: `Subscription updated: ${data.tier} (${data.status})`,
        ipAddress: 'system',
        userAgent: 'FAP Webhook'
      });
    } catch (error) {
      console.error('Failed to handle subscription update webhook:', error);
      throw error;
    }
  }

  private async handleCrossPlatformTicket(data: any): Promise<void> {
    try {
      // Create corresponding ticket in TGF system
      const ticket = await storage.createSupportTicket({
        customerId: parseInt(data.customerId),
        subject: `[FAP] ${data.subject}`,
        description: data.description,
        priority: data.priority,
        category: data.category,
        source: 'fap_crossplatform',
      });

      console.log(`Created cross-platform support ticket: ${ticket.ticketNumber}`);
    } catch (error) {
      console.error('Failed to handle cross-platform ticket:', error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('/health');
      return true;
    } catch (error) {
      console.error('FAP integration health check failed:', error);
      return false;
    }
  }
}

export const fapIntegration = new FAPIntegrationService();