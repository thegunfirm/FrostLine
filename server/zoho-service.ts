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