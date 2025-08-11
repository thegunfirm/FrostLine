import axios from 'axios';

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accountsHost: string;
  apiHost: string;
  accessToken?: string;
  refreshToken?: string;
}

export class ZohoService {
  private config: ZohoConfig;

  constructor(config: ZohoConfig) {
    this.config = config;
  }

  // Generate OAuth authorization URL
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'ZohoCRM.modules.ALL ZohoCRM.settings.ALL ZohoCRM.users.ALL ZohoCRM.org.READ',
      redirect_uri: this.config.redirectUri,
      access_type: 'offline',
      prompt: 'consent'
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.accountsHost}/oauth/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const response = await axios.post(`${this.config.accountsHost}/oauth/v2/token`, {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code: code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Zoho token exchange error:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    if (!this.config.accessToken) {
      return false;
    }

    try {
      const response = await axios.get(`${this.config.apiHost}/crm/v2/org`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('Zoho connection test failed:', error);
      return false;
    }
  }

  // ===== DEAL MANAGEMENT METHODS =====

  /**
   * Create a Deal in Zoho CRM for a TheGunFirm order
   */
  async createOrderDeal(orderData: {
    contactId: string;
    orderNumber: string;
    totalAmount: number;
    orderItems: Array<{
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    membershipTier: string;
    fflRequired: boolean;
    fflDealerName?: string;
    orderStatus: string;
  }): Promise<{ success: boolean; dealId?: string; error?: string }> {
    try {
      if (!this.config.accessToken) {
        return { success: false, error: 'No Zoho access token available' };
      }

      const dealName = `Order #${orderData.orderNumber} - ${orderData.membershipTier}`;
      const description = this.buildOrderDescription(orderData);

      const dealPayload = {
        data: [{
          Deal_Name: dealName,
          Contact_Name: orderData.contactId,
          Amount: orderData.totalAmount,
          Stage: this.mapOrderStatusToDealStage(orderData.orderStatus),
          Description: description,
          Closing_Date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
          Order_Number: orderData.orderNumber,
          Order_Total: orderData.totalAmount,
          Membership_Tier: orderData.membershipTier,
          FFL_Required: orderData.fflRequired,
          FFL_Dealer_Name: orderData.fflDealerName || '',
          Order_Item_Count: orderData.orderItems.length,
          Lead_Source: 'TheGunFirm.com'
        }]
      };

      const response = await axios.post(
        `${this.config.apiHost}/crm/v2/Deals`,
        dealPayload,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.data?.[0]?.status === 'success') {
        const dealId = response.data.data[0].details.id;
        console.log(`✅ Created Zoho Deal ${dealId} for Order #${orderData.orderNumber}`);
        return { success: true, dealId };
      } else {
        console.error('Zoho Deal creation failed:', response.data);
        return { success: false, error: 'Deal creation failed in Zoho' };
      }

    } catch (error: any) {
      console.error('Error creating Zoho deal:', error.response?.data || error.message);
      return { success: false, error: `Deal creation error: ${error.message}` };
    }
  }

  /**
   * Update Deal stage when order status changes
   */
  async updateDealStage(dealId: string, newOrderStatus: string): Promise<boolean> {
    try {
      if (!this.config.accessToken) {
        return false;
      }

      const newStage = this.mapOrderStatusToDealStage(newOrderStatus);
      
      const updatePayload = {
        data: [{
          id: dealId,
          Stage: newStage
        }]
      };

      const response = await axios.put(
        `${this.config.apiHost}/crm/v2/Deals`,
        updatePayload,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data?.data?.[0]?.status === 'success';
    } catch (error: any) {
      console.error('Error updating deal stage:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get Deal by Order Number
   */
  async getDealByOrderNumber(orderNumber: string): Promise<any> {
    try {
      if (!this.config.accessToken) {
        return null;
      }

      const response = await axios.get(
        `${this.config.apiHost}/crm/v2/Deals/search?criteria=(Order_Number:equals:${orderNumber})`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`
          }
        }
      );

      return response.data?.data?.[0] || null;
    } catch (error: any) {
      console.error('Error searching for deal:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Build detailed order description for Deal
   */
  private buildOrderDescription(orderData: any): string {
    let description = `Order from TheGunFirm.com\n`;
    description += `Customer Tier: ${orderData.membershipTier}\n`;
    description += `Total Items: ${orderData.orderItems.length}\n`;
    
    if (orderData.fflRequired) {
      description += `FFL Required: Yes\n`;
      if (orderData.fflDealerName) {
        description += `FFL Dealer: ${orderData.fflDealerName}\n`;
      }
    }
    
    description += `\nOrder Items:\n`;
    orderData.orderItems.forEach((item: any, index: number) => {
      description += `${index + 1}. ${item.productName} (${item.sku})\n`;
      description += `   Qty: ${item.quantity} × $${item.unitPrice} = $${item.totalPrice}\n`;
    });
    
    return description;
  }

  /**
   * Map TheGunFirm order status to Zoho Deal stage
   */
  private mapOrderStatusToDealStage(orderStatus: string): string {
    const statusMapping: Record<string, string> = {
      'pending': 'Qualification',
      'processing': 'Needs Analysis', 
      'payment_pending': 'Proposal/Quote',
      'payment_confirmed': 'Negotiation/Review',
      'preparing': 'Closed Won',
      'shipped': 'Closed Won',
      'delivered': 'Closed Won',
      'cancelled': 'Closed Lost',
      'refunded': 'Closed Lost'
    };

    return statusMapping[orderStatus] || 'Qualification';
  }

  // Set tokens
  setTokens(accessToken: string, refreshToken?: string) {
    this.config.accessToken = accessToken;
    if (refreshToken) {
      this.config.refreshToken = refreshToken;
    }
  }

  // Get access token property
  get accessToken(): string | undefined {
    return this.config.accessToken;
  }

  /**
   * Make authenticated API requests to Zoho CRM
   */
  async makeAPIRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available. Please complete OAuth first.');
    }

    const response = await fetch(`${this.config.apiHost}/crm/v6/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Zoho API Error:', result);
      throw new Error(`Zoho API Error: ${result.message || response.statusText}`);
    }

    return result;
  }

  /**
   * Find contact by email address
   */
  async findContactByEmail(email: string): Promise<any | null> {
    try {
      // Search for contact by email using search API
      const searchCriteria = `(Email:equals:${email})`;
      const response = await this.makeAPIRequest(`Contacts/search?criteria=${encodeURIComponent(searchCriteria)}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0]; // Return first match
      }
      
      return null;
    } catch (error) {
      console.error('Error finding contact by email:', error);
      return null;
    }
  }

  /**
   * Create a new contact in Zoho CRM
   */
  async createContact(contactData: any): Promise<any> {
    try {
      const response = await this.makeAPIRequest('Contacts', 'POST', {
        data: [contactData]
      });

      if (response.data && response.data.length > 0 && response.data[0].status === 'success') {
        return {
          id: response.data[0].details.id,
          ...contactData
        };
      } else {
        throw new Error('Failed to create contact in Zoho');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<any | null> {
    try {
      const response = await this.makeAPIRequest(`Contacts/${contactId}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }

  /**
   * Update contact in Zoho CRM
   */
  async updateContact(contactId: string, updateData: any): Promise<any> {
    try {
      const response = await this.makeAPIRequest(`Contacts/${contactId}`, 'PUT', {
        data: [updateData]
      });

      if (response.data && response.data.length > 0 && response.data[0].status === 'success') {
        return response.data[0];
      } else {
        throw new Error('Failed to update contact in Zoho');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Update membership tier name for all users with the old tier name
   */
  async updateMembershipTierName(oldTierName: string, newTierName: string): Promise<void> {
    try {
      // Search for contacts with the old tier name
      const searchCriteria = `(Subscription_Tier:equals:${oldTierName})`;
      const response = await this.makeAPIRequest(`Contacts/search?criteria=${encodeURIComponent(searchCriteria)}`);
      
      if (response.data && response.data.length > 0) {
        // Update each contact with the new tier name
        const updatePromises = response.data.map((contact: any) => 
          this.updateContact(contact.id, {
            Subscription_Tier: newTierName
          })
        );
        
        await Promise.all(updatePromises);
        console.log(`Updated ${response.data.length} contacts from ${oldTierName} to ${newTierName}`);
      }
    } catch (error) {
      console.error('Error updating membership tier names:', error);
      throw error;
    }
  }

  /**
   * Ensure a membership tier exists in Zoho CRM (for validation purposes)
   */
  async ensureMembershipTierExists(tierName: string): Promise<boolean> {
    try {
      // For now, this is a simple validation that the tier name is one of our known tiers
      const validTiers = [
        'Platinum Founder',
        'Platinum Monthly', 
        'Gold Annually',
        'Gold Monthly',
        'Bronze'
      ];
      
      if (validTiers.includes(tierName)) {
        console.log(`Tier ${tierName} is valid`);
        return true;
      } else {
        console.log(`Tier ${tierName} is not a valid tier`);
        return false;
      }
    } catch (error) {
      console.error('Error validating membership tier:', error);
      return false;
    }
  }
}