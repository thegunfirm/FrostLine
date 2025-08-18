import axios from 'axios';
import { ZohoProductLookupService } from './services/zoho-product-lookup-service';

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
  private tokenRefreshTimer?: NodeJS.Timeout;
  private refreshInProgress = false;
  private productLookupService: ZohoProductLookupService;

  constructor(config: ZohoConfig) {
    this.config = config;
    this.productLookupService = new ZohoProductLookupService(this);
    // Start automatic token refresh every 50 minutes (Zoho tokens expire in 1 hour)
    this.startAutoTokenRefresh();
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

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<{ access_token: string; expires_in: number }> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.refreshInProgress) {
      console.log('⏳ Token refresh already in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { access_token: this.config.accessToken!, expires_in: 3600 };
    }

    this.refreshInProgress = true;

    try {
      console.log('🔄 Refreshing Zoho access token automatically...');
      const response = await axios.post(`${this.config.accountsHost}/oauth/v2/token`, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Update the access token in config
      this.config.accessToken = response.data.access_token;
      
      console.log('✅ Zoho access token refreshed automatically - no more daily expiration!');
      return response.data;
    } catch (error: any) {
      console.error('❌ Zoho token refresh error:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    } finally {
      this.refreshInProgress = false;
    }
  }

  // Start automatic token refresh every 50 minutes
  private startAutoTokenRefresh(): void {
    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh token every 50 minutes (3000000 ms) - Zoho tokens expire in 60 minutes
    this.tokenRefreshTimer = setInterval(async () => {
      try {
        if (this.config.refreshToken) {
          console.log('⏰ Auto-refreshing Zoho token (preventing daily expiration)...');
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.error('⚠️ Auto token refresh failed:', error);
      }
    }, 50 * 60 * 1000); // 50 minutes

    console.log('🔄 Automatic Zoho token refresh started - will refresh every 50 minutes');
  }

  // Stop automatic token refresh (cleanup)
  public stopAutoTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
      console.log('🛑 Automatic token refresh stopped');
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
    systemFields?: any; // Add system fields parameter
  }): Promise<{ success: boolean; dealId?: string; error?: string }> {
    try {
      if (!this.config.accessToken) {
        return { success: false, error: 'No Zoho access token available' };
      }

      const dealName = `Order #${orderData.orderNumber} - ${orderData.membershipTier}`;
      
      // Only use detailed description if system fields are not provided
      // When system fields are provided, use clean minimal description
      const description = orderData.systemFields 
        ? `Order from TheGunFirm.com - ${orderData.membershipTier} member`
        : this.buildOrderDescription(orderData);

      // Build the base deal payload
      const baseDealData = {
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
      };

      // Add system fields if provided (instead of putting everything in Description)
      if (orderData.systemFields) {
        Object.assign(baseDealData, orderData.systemFields);
        console.log(`🔍 Adding system fields to Zoho deal:`, orderData.systemFields);
        console.log(`📋 Final deal payload being sent to Zoho:`, JSON.stringify(baseDealData, null, 2));
        console.log(`🧹 CLEAN DESCRIPTION (no JSON): "${baseDealData.Description}"`);
      } else {
        console.log(`⚠️  NO SYSTEM FIELDS PROVIDED - using fallback description with order details`);
        console.log(`📋 Fallback payload:`, JSON.stringify(baseDealData, null, 2));
      }

      const dealPayload = {
        data: [baseDealData]
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
   * Update Contact email verification status in Zoho CRM
   */
  async updateContactEmailVerification(email: string, verifiedAt: Date): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.accessToken) {
        console.log('⚠️ No Zoho access token available for email verification update');
        return { success: false, error: 'No access token available' };
      }

      console.log(`🔄 Updating Zoho Contact email verification for: ${email}`);

      // First, find the Contact by email using the dedicated email parameter
      const searchResponse = await axios.get(
        `${this.config.apiHost}/crm/v2/Contacts/search?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`
          }
        }
      );

      if (!searchResponse.data?.data || searchResponse.data.data.length === 0) {
        console.log(`⚠️ Contact not found in Zoho for email: ${email}`);
        return { success: false, error: 'Contact not found in Zoho CRM' };
      }

      const contactId = searchResponse.data.data[0].id;
      console.log(`📝 Found Zoho Contact ID: ${contactId} for ${email}`);

      // Update the Contact with email verification fields
      // Using the API field names (underscores instead of spaces)
      // Convert to Zoho datetime format: yyyy-MM-ddTHH:mm:ss
      const zohoTimestamp = verifiedAt.toISOString().replace(/\.\d{3}Z$/, '');
      
      const updatePayload = {
        data: [{
          id: contactId,
          "Email_Verified": true, // Custom checkbox field (Yes/No)
          "Email_Verification_Time_Stamp": zohoTimestamp, // Custom DateTime field
          "Email_Opt_Out": false // Custom checkbox field (default to not opted out)
        }]
      };

      const updateResponse = await axios.put(
        `${this.config.apiHost}/crm/v2/Contacts`,
        updatePayload,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (updateResponse.data?.data?.[0]?.status === 'success') {
        console.log(`✅ Zoho Contact email verification updated for: ${email}`);
        return { success: true };
      } else {
        console.error('Zoho Contact email verification update failed:', updateResponse.data);
        return { success: false, error: 'Update failed in Zoho CRM' };
      }

    } catch (error: any) {
      // Handle token refresh if needed
      if (error.response?.status === 401 && this.config.refreshToken) {
        console.log('🔄 Access token expired, attempting to refresh...');
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult) {
          // Retry the operation with new token
          return this.updateContactEmailVerification(email, verifiedAt);
        }
      }
      
      console.error('Error updating Zoho Contact email verification:', error.response?.data || error.message);
      return { success: false, error: `Zoho update error: ${error.message}` };
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
   * Get Deal by ID with all fields
   */
  async getDealById(dealId: string): Promise<any> {
    try {
      const response = await this.makeAPIRequest(`Deals/${dealId}`);
      return response.data?.[0] || null;
    } catch (error: any) {
      console.error('Error retrieving deal by ID:', error.response?.data || error.message);
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
   * Make authenticated API requests to Zoho CRM with automatic token refresh
   */
  async makeAPIRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, retryCount = 0): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available. Please complete OAuth first.');
    }

    // Handle case where apiHost already includes /crm/v2
    const baseUrl = this.config.apiHost.endsWith('/crm/v2') ? this.config.apiHost : `${this.config.apiHost}/crm/v2`;
    const fullUrl = `${baseUrl}/${endpoint}`;
    
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    let result;
    const responseText = await response.text();
    
    // Handle empty responses (common for successful POST operations)
    if (!responseText || responseText.trim() === '') {
      console.log(`✅ Empty response from ${endpoint} (successful operation)`);
      result = { success: true, data: [] };
    } else {
      result = JSON.parse(responseText);
    }
    
    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429 || (result.error_description && result.error_description.includes('too many requests'))) {
        if (retryCount < 2) {
          const backoffMs = Math.pow(2, retryCount + 1) * 1000; // 2s, 4s
          console.log(`⏳ Rate limited, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/2)`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return this.makeAPIRequest(endpoint, method, data, retryCount + 1);
        }
      }
      
      // If token is invalid and we haven't retried yet, try to refresh token
      if (result.code === 'INVALID_TOKEN' && retryCount === 0 && this.config.refreshToken) {
        console.log('🔄 Access token expired, attempting to refresh...');
        try {
          await this.refreshAccessToken();
          // Retry the request with the new token
          return this.makeAPIRequest(endpoint, method, data, retryCount + 1);
        } catch (refreshError) {
          console.error('❌ Failed to refresh token:', refreshError);
          throw new Error(`Token refresh failed: ${refreshError}`);
        }
      }
      
      console.error('Zoho API Error:', result);
      console.error('Full URL was:', fullUrl);
      console.error('Request headers:', {
        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
        'Content-Type': 'application/json',
      });
      throw new Error(`Zoho API Error: ${result.message || response.statusText}`);
    }

    return result;
  }

  /**
   * Find contact by email address
   */
  async findContactByEmail(email: string): Promise<any | null> {
    try {
      // Use simple query parameter approach instead of criteria search
      const response = await this.makeAPIRequest(`Contacts?fields=Email,First_Name,Last_Name,id,Description&per_page=200`);
      
      if (response.data && response.data.length > 0) {
        // Filter by email in the response since direct search had URL issues
        const contact = response.data.find((c: any) => c.Email === email);
        return contact || null;
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
      console.log('🔍 Zoho Contact Creation Debug - Data being sent:', JSON.stringify(contactData, null, 2));
      
      const response = await this.makeAPIRequest('Contacts', 'POST', {
        data: [contactData]
      });

      console.log('🔍 Zoho Contact Creation Response:', JSON.stringify(response, null, 2));

      if (response.data && response.data.length > 0 && response.data[0].status === 'success') {
        console.log('✅ Zoho Contact created successfully:', response.data[0].details.id);
        return {
          id: response.data[0].details.id,
          ...contactData
        };
      } else {
        // Handle duplicate data case - this is actually success!
        if (response.data && response.data[0] && response.data[0].code === 'DUPLICATE_DATA') {
          console.log('✅ Contact already exists, using existing ID:', response.data[0].details.id);
          return {
            id: response.data[0].details.id,
            ...contactData
          };
        }
        
        console.error('❌ Zoho Contact creation failed. Full response:', JSON.stringify(response, null, 2));
        if (response.data && response.data[0] && response.data[0].message) {
          throw new Error(`Failed to create contact in Zoho: ${response.data[0].message}`);
        }
        throw new Error('Failed to create contact in Zoho - no success status returned');
      }
    } catch (error) {
      console.error('❌ Zoho Contact creation error:', error);
      if (error.response && error.response.data) {
        console.error('❌ Zoho API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
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
    }
  }

  /**
   * Get field metadata for a Zoho module (Field Discovery)
   */
  async getFieldsMetadata(module: string): Promise<any[]> {
    try {
      const response = await this.makeAPIRequest(`settings/fields?module=${module}`);
      
      if (response.fields) {
        return response.fields.map((field: any) => ({
          api_name: field.api_name,
          field_label: field.field_label,
          data_type: field.data_type,
          custom_field: field.custom_field || false,
          mandatory: field.mandatory || false,
          read_only: field.read_only || false
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting field metadata:', error);
      return [];
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

  // ==================== DEAL MANAGEMENT METHODS ====================

  /**
   * Find deal by order number
   */
  async getDealByOrderNumber(orderNumber: string): Promise<any | null> {
    try {
      // Get all deals and filter by order number in description or custom field
      const response = await this.makeAPIRequest(`Deals?fields=Deal_Name,Amount,Stage,id,Description&per_page=200`);
      
      if (response.data && response.data.length > 0) {
        // Look for deal with matching order number in deal name or description
        const deal = response.data.find((d: any) => 
          d.Deal_Name?.includes(orderNumber) ||
          d.Description?.includes(orderNumber)
        );
        return deal || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for deal:', error);
      return null;
    }
  }

  /**
   * Find or create a product by SKU using the product lookup service
   */
  async findOrCreateProductBySKU(sku: string, productInfo: {
    productName?: string;
    manufacturer?: string;
    category?: string;
  }): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      const result = await this.productLookupService.findOrCreateProductBySKU({
        sku,
        productName: productInfo.productName,
        manufacturer: productInfo.manufacturer,
        productCategory: productInfo.category
      });

      if (result.productId) {
        return {
          success: true,
          productId: result.productId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to find or create product'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new deal from order data with proper Subform_1 structure
   */
  async createOrderDeal(dealData: {
    contactId: string;
    orderNumber: string;
    totalAmount: number;
    orderItems: any[];
    membershipTier: string;
    fflRequired: boolean;
    fflDealerName?: string;
    orderStatus: string;
    systemFields?: any;
  }): Promise<{ success: boolean; dealId?: string; error?: string }> {
    try {
      console.log('🔄 Creating deal with subform data in single step...');
      
      // Prepare system fields
      const cleanSystemFields = dealData.systemFields ? { ...dealData.systemFields } : {};
      
      // Remove any problematic fields that cause Layout errors
      delete cleanSystemFields.Layout;
      delete cleanSystemFields.layout;
      delete cleanSystemFields.LAYOUT;
      
      // CRITICAL FIX: Use the correct field structure for Zoho subforms
      // The field name must match the API name from the layout exactly
      const orderProducts = dealData.orderItems.map(item => ({
        Product_Name: item.productName || item.name,
        Product_Code: item.sku,
        Quantity: parseInt(item.quantity) || 1,
        Unit_Price: parseFloat(item.unitPrice) || 0,
        Distributor_Part_Number: item.rsrStockNumber || '',
        Manufacturer: item.manufacturer || '',
        Product_Category: item.category || '',
        FFL_Required: item.fflRequired === true,
        Drop_Ship_Eligible: item.dropShipEligible === true,
        In_House_Only: item.inHouseOnly === true,
        Distributor: 'RSR'
      }));

      // CRITICAL: Use exact layout ID and force layout specification
      const dealPayload: any = {
        Deal_Name: dealData.orderNumber,
        Amount: parseFloat(dealData.totalAmount) || 0,
        Stage: this.mapOrderStatusToDealStage(dealData.orderStatus),
        Contact_Name: dealData.contactId,
        Description: `TGF Order - ${dealData.membershipTier} member`,
        $layout_id: '6585331000000091023',  // Force specific layout
        Subform_1: orderProducts,  // Use exact API field name
        ...cleanSystemFields
      };

      console.log('🚀 Creating deal with subform data...');
      console.log('📋 Deal payload:', JSON.stringify(dealPayload, null, 2));

      const createResponse = await this.makeAPIRequest('Deals', 'POST', {
        data: [dealPayload],
        trigger: ["workflow"]
      });

      console.log('📥 Deal creation response:', JSON.stringify(createResponse, null, 2));

      if (!createResponse.data || createResponse.data.length === 0 || createResponse.data[0].status !== 'success') {
        console.log('❌ Deal creation failed:', JSON.stringify(createResponse, null, 2));
        return {
          success: false,
          error: `Failed to create deal: ${JSON.stringify(createResponse)}`
        };
      }

      const dealId = createResponse.data[0].details.id;
      console.log(`✅ Deal created successfully: ${dealId}`);
      
      // Verify the subform was populated by fetching the deal back
      await this.verifyDealSubform(dealId, dealData.orderItems.length);

      return {
        success: true,
        dealId: dealId
      };

    } catch (error: any) {
      console.error('❌ Error creating deal with subform:', error);
      return {
        success: false,
        error: `Deal creation error: ${error.message}`
      };
    }
  }

  // Method to verify if subform was populated correctly
  async verifyDealSubform(dealId: string, expectedProductCount: number): Promise<boolean> {
    try {
      console.log(`🔍 Verifying Deal ${dealId} subform population...`);
      
      // Wait a moment for Zoho to process the record
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch the deal back with specific fields
      const response = await this.makeAPIRequest(`Deals/${dealId}?fields=Subform_1,Deal_Name,Amount`);
      
      if (response && response.data && response.data.length > 0) {
        const deal = response.data[0];
        
        // Check for subform data using the correct field name
        const subform1 = deal.Subform_1 || [];
        
        console.log(`📊 Subform verification results:`);
        console.log(`  • Deal Name: ${deal.Deal_Name}`);
        console.log(`  • Amount: $${deal.Amount}`);
        console.log(`  • Subform_1: ${subform1.length} items`);
        
        if (subform1.length > 0) {
          console.log(`✅ SUCCESS: Found ${subform1.length} products in subform (expected ${expectedProductCount})`);
          
          // Log each product for confirmation
          subform1.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.Product_Name} (${product.Product_Code})`);
            console.log(`     Qty: ${product.Quantity}, Price: $${product.Unit_Price}`);
            console.log(`     RSR: ${product.Distributor_Part_Number}, FFL: ${product.FFL_Required}`);
          });
          return true;
        } else {
          console.log(`❌ FAILURE: No products found in Subform_1`);
          console.log('📋 Available fields in deal:', Object.keys(deal));
          return false;
        }
      } else {
        console.log('❌ Could not fetch deal for verification');
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying deal subform:', error);
      return false;
    }
  }

  /**
   * Add products to Deal subform (Order Products)
   */
  async addProductsToDeal(dealId: string, orderItems: any[]): Promise<void> {
    try {
      console.log(`🛒 Adding ${orderItems.length} products to Deal ${dealId}...`);
      
      // For each product in the order, create a product lookup and add to deal
      for (const item of orderItems) {
        try {
          console.log(`🔍 Processing product: ${item.sku} (${item.productName || item.name})`);
          
          // Find or create the product in Zoho Products module
          let productId = null;
          
          try {
            // Search for existing product by SKU (using Product_Name field)
            const productSearch = await this.makeAPIRequest(`Products/search?criteria=(Product_Name:equals:${item.sku})`);
            
            if (productSearch && productSearch.data && productSearch.data.length > 0) {
              productId = productSearch.data[0].id;
              console.log(`✅ Found existing product ${productId} for SKU: ${item.sku}`);
            } else {
              console.log(`🏗️ Product not found for SKU: ${item.sku}, creating new product...`);
              
              // Create new product if it doesn't exist
              const newProductPayload = {
                data: [{
                  Product_Name: item.sku,
                  Product_Code: item.sku,
                  Unit_Price: item.unitPrice || item.price || 0
                }]
              };
              
              const createResult = await this.makeAPIRequest('Products', 'POST', newProductPayload);
              if (createResult && createResult.data && createResult.data.length > 0 && createResult.data[0].status === 'success') {
                productId = createResult.data[0].details.id;
                console.log(`✅ Created new product ${productId} for SKU: ${item.sku}`);
              } else {
                console.error(`❌ Failed to create product for SKU: ${item.sku}`, createResult);
                continue;
              }
            }
          } catch (searchError: any) {
            console.error(`❌ Product search/create failed for ${item.sku}:`, searchError.message);
            continue;
          }

          if (!productId) {
            console.error(`❌ No product ID available for SKU: ${item.sku}`);
            continue;
          }

          // Add product to Deal using the Products related list API
          const dealProductPayload = {
            data: [{
              Product: productId,  // Use 'Product' field instead of 'Product_Name'
              Quantity: item.quantity || 1,
              Unit_Price: item.unitPrice || item.price || 0,
              Total: (item.quantity || 1) * (item.unitPrice || item.price || 0),
              Line_Tax: 0
            }]
          };

          console.log(`📦 Adding product to deal with payload:`, dealProductPayload);
          
          try {
            const addResult = await this.makeAPIRequest(`Deals/${dealId}/Products`, 'POST', dealProductPayload);
            console.log(`✅ Successfully added product ${item.sku} to Deal ${dealId}:`, addResult);
          } catch (addError: any) {
            // Handle empty response (success case) or actual errors
            if (addError.message.includes('Unexpected end of JSON input')) {
              console.log(`✅ Product ${item.sku} added to Deal ${dealId} (empty response = success)`);
            } else {
              console.error(`❌ Failed to add product ${item.sku} to deal:`, addError.message);
            }
          }
          
        } catch (error: any) {
          console.error(`❌ Failed to process product ${item.sku}:`, error.message);
          // Continue with other products
        }
      }
      
      console.log(`🎯 Finished processing ${orderItems.length} products for Deal ${dealId}`);
      
    } catch (error: any) {
      console.error('Error adding products to deal:', error.message);
      // Don't throw - let the deal creation succeed even if product linking fails
    }
  }



  /**
   * Get all deals for a contact
   */
  async getContactDeals(contactId: string): Promise<any[]> {
    try {
      // Get all deals and filter by contact ID
      const response = await this.makeAPIRequest(`Deals?fields=Deal_Name,Amount,Stage,id,Description,Contact_Name&per_page=200`);
      
      if (response.data && response.data.length > 0) {
        // Filter deals by contact ID
        return response.data.filter((deal: any) => deal.Contact_Name?.id === contactId);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting contact deals:', error);
      return [];
    }
  }

  /**
   * Get Contact by ID for debugging (aliased method)
   */
  async getContactById(contactId: string): Promise<any> {
    return this.getContact(contactId);
  }

  /**
   * Search Contact by email for debugging (aliased method)
   */
  async searchContactByEmail(email: string): Promise<any> {
    try {
      const contact = await this.findContactByEmail(email);
      
      if (contact) {
        return {
          data: [contact]
        };
      } else {
        return {
          data: []
        };
      }
    } catch (error: any) {
      console.error('Error in searchContactByEmail:', error);
      throw error;
    }
  }

  /**
   * Generic method to search records in any module
   */
  async searchRecords(module: string, criteria: string): Promise<any> {
    try {
      if (!this.config.accessToken) {
        throw new Error('No Zoho access token available');
      }

      // Use makeAPIRequest to handle URL construction properly
      return await this.makeAPIRequest(`${module}/search?criteria=${encodeURIComponent(criteria)}`);

    } catch (error: any) {
      console.error(`Error searching ${module}:`, error);
      throw error;
    }
  }

  /**
   * Generic method to create a record in any module
   */
  async createRecord(module: string, data: any): Promise<any> {
    try {
      console.log('🔍 createRecord called with config:', {
        hasConfig: !!this.config,
        hasAccessToken: !!this.config?.accessToken,
        configKeys: this.config ? Object.keys(this.config) : 'no config'
      });
      
      if (!this.config?.accessToken) {
        throw new Error('No Zoho access token available');
      }

      const payload = {
        data: [data]
      };

      // Use makeAPIRequest to handle URL construction properly
      return await this.makeAPIRequest(module, 'POST', payload);

    } catch (error: any) {
      console.error(`Error creating ${module} record:`, error);
      throw error;
    }
  }

  /**
   * Upsert product using Product_Code as unique key
   */
  async upsertProduct(productData: any): Promise<any> {
    try {
      if (!this.config?.accessToken) {
        throw new Error('No Zoho access token available');
      }

      // First try to find existing product by Product_Name (SKU)
      const searchCriteria = `Product_Name:equals:${productData.Product_Code}`;
      const existingProducts = await this.searchRecords('Products', searchCriteria);
      
      if (existingProducts?.data && existingProducts.data.length > 0) {
        // Product exists, return the existing one
        console.log(`📦 Found existing product: ${productData.Product_Code} (${existingProducts.data[0].id})`);
        return existingProducts.data[0];
      }

      // Product doesn't exist, create it with upsert logic
      const upsertPayload = {
        data: [productData],
        duplicate_check_fields: ["Product_Code"],
        options: {
          upsert: true
        }
      };

      console.log(`📦 Creating new product: ${productData.Product_Code}`);
      const result = await this.makeAPIRequest('Products', 'POST', upsertPayload);
      
      if (result?.data && result.data.length > 0) {
        return result.data[0];
      }
      
      throw new Error('Failed to create product - no data returned');

    } catch (error: any) {
      console.error(`Error upserting product ${productData.Product_Code}:`, error);
      throw error;
    }
  }
}