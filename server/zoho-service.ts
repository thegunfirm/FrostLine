import axios, { AxiosResponse } from 'axios';

interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  region: 'com' | 'eu' | 'in' | 'com.au';
  accessToken?: string;
  refreshToken?: string;
}

interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

interface CustomerData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipTier?: string;
  fapUserId?: string;
}

interface OrderData {
  customerId: string;
  orderId: string;
  transactionId: string;
  items: Array<{
    rsrNumber: string;
    productName: string;
    quantity: number;
    price: number;
    manufacturer?: string;
    category?: string;
  }>;
  totalAmount: number;
  orderDate: Date;
  fflDealerId?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

interface FFLVendorData {
  id?: string;
  businessName: string;
  fflNumber: string;
  contactName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: 'active' | 'inactive';
  specializations?: string[];
}

export class ZohoService {
  private config: ZohoConfig;
  private baseUrl: string;

  constructor(config: ZohoConfig) {
    this.config = config;
    this.baseUrl = `https://www.zohoapis.${config.region}`;
  }

  // Authentication Methods
  async exchangeCodeForTokens(authCode: string): Promise<ZohoTokenResponse> {
    const tokenUrl = `${process.env.ZOHO_ACCOUNTS_HOST}/oauth/v2/token`;
    
    // Prepare form data exactly as Zoho expects
    const formData = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code: authCode
    };

    console.log('🔄 Exchanging code for tokens...');
    console.log('  - Token URL:', tokenUrl);
    console.log('  - Grant type: authorization_code');
    console.log('  - Client ID:', this.config.clientId);
    console.log('  - Client Secret:', this.config.clientSecret ? '[SET]' : '[MISSING]');
    console.log('  - Redirect URI:', this.config.redirectUri);
    console.log('  - Auth Code:', authCode);
    console.log('  - Full request data:', JSON.stringify(formData, null, 2));
    
    try {
      const response = await axios.post(tokenUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('✅ Token exchange successful');
      console.log('  - Response status:', response.status);
      console.log('  - Response headers:', response.headers);
      console.log('  - Response data:', JSON.stringify(response.data, null, 2));
      console.log('  - Access token received:', !!response.data.access_token);
      console.log('  - Refresh token received:', !!response.data.refresh_token);
      
      this.config.accessToken = response.data.access_token;
      this.config.refreshToken = response.data.refresh_token;
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Token exchange failed:');
      console.error('  - Status:', error.response?.status);
      console.error('  - Status Text:', error.response?.statusText);
      console.error('  - Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  - Request URL:', tokenUrl);
      console.error('  - Request Headers:', JSON.stringify(error.config?.headers, null, 2));
      console.error('  - Request Data:', JSON.stringify(error.config?.data, null, 2));
      console.error('  - Full Error:', error.message);
      
      // Check if response is HTML (indicates wrong endpoint or auth issue)
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<html>')) {
        console.error('❌ Received HTML response instead of JSON - this indicates authentication or endpoint issues');
        console.error('❌ This usually means: wrong client credentials, wrong data center, or malformed request');
      }
      
      throw new Error(`Token exchange failed: ${error.response?.status} - Check credentials and data center settings`);
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`https://accounts.zoho.${this.config.region}/oauth/v2/token`, {
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken
    });

    this.config.accessToken = response.data.access_token;
    return response.data.access_token;
  }

  getAuthorizationUrl(state?: string): string {
    const scope = 'ZohoCRM.modules.ALL ZohoCRM.settings.ALL ZohoCRM.users.ALL ZohoCRM.org.READ';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: scope,
      redirect_uri: this.config.redirectUri,
      access_type: 'offline',
      prompt: 'consent'
    });
    
    if (state) {
      params.append('state', state);
    }
    
    return `${process.env.ZOHO_ACCOUNTS_HOST}/oauth/v2/auth?${params.toString()}`;
  }

  async getConnectionStatus() {
    return {
      isConnected: !!this.config.accessToken,
      accountName: this.config.accessToken ? 'Connected' : null,
      expiresAt: null,
      scopes: process.env.ZOHO_SCOPE?.split(',') || [],
      lastSync: null
    };
  }

  async testConnection() {
    if (!this.config.accessToken) {
      return { success: false, message: 'No access token available' };
    }

    try {
      const response = await this.makeRequest('GET', '/crm/v2/org');
      return { 
        success: true, 
        message: 'Connection successful',
        data: response 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  async disconnect() {
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
    process.env.ZOHO_ACCESS_TOKEN = '';
    process.env.ZOHO_REFRESH_TOKEN = '';
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    if (!this.config.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        data
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expired, refresh and retry
        await this.refreshAccessToken();
        return this.makeRequest(method, endpoint, data);
      }
      throw error;
    }
  }

  // Customer Management
  async createCustomer(customerData: CustomerData): Promise<string> {
    const zohoContact = {
      data: [{
        First_Name: customerData.firstName,
        Last_Name: customerData.lastName,
        Email: customerData.email,
        Phone: customerData.phone,
        Lead_Source: "Website",
        Tier: customerData.membershipTier, // Use "Tier" field instead of custom field
        Custom_Fields: {
          FAP_User_ID: customerData.fapUserId
        }
      }]
    };

    const response = await this.makeRequest('POST', '/crm/v6/Contacts', zohoContact);
    return response.data[0].details.id;
  }

  async updateCustomer(zohoCustomerId: string, customerData: Partial<CustomerData>): Promise<void> {
    const updateData = {
      data: [{
        id: zohoCustomerId,
        First_Name: customerData.firstName,
        Last_Name: customerData.lastName,
        Email: customerData.email,
        Phone: customerData.phone,
        Custom_Fields: {
          Membership_Tier: customerData.membershipTier,
          FAP_User_ID: customerData.fapUserId
        }
      }]
    };

    await this.makeRequest('PUT', '/crm/v6/Contacts', updateData);
  }

  async getCustomer(zohoCustomerId: string): Promise<any> {
    return await this.makeRequest('GET', `/crm/v6/Contacts/${zohoCustomerId}`);
  }

  async getContact(zohoContactId: string): Promise<any> {
    const response = await this.makeRequest('GET', `/crm/v6/Contacts/${zohoContactId}`);
    return response.data?.[0] || null;
  }

  async getContactByEmail(email: string): Promise<any> {
    const response = await this.makeRequest('GET', `/crm/v6/Contacts/search?criteria=Email:equals:${encodeURIComponent(email)}`);
    return response.data?.[0] || null;
  }

  async createOrUpdateContact(contactData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    membershipTier: string;
    fapUserId: string;
  }): Promise<string> {
    return await this.createCustomer(contactData);
  }

  async updateContact(zohoCustomerId: string, updateData: { membershipTier: string }): Promise<void> {
    const contactUpdateData = {
      data: [{
        id: zohoCustomerId,
        Custom_Fields: {
          Membership_Tier: updateData.membershipTier
        }
      }]
    };
    
    await this.makeRequest('PUT', '/crm/v6/Contacts', contactUpdateData);
  }

  async createOrder(orderData: any): Promise<string> {
    return await this.recordOrder(orderData);
  }

  async createOrUpdateVendor(vendorData: any): Promise<string> {
    return await this.createFFLVendor(vendorData);
  }

  // Order Management
  async recordOrder(orderData: OrderData): Promise<string> {
    // Create order record in Deals module
    const zohoDeal = {
      data: [{
        Deal_Name: `Order ${orderData.orderId}`,
        Contact_Name: orderData.customerId,
        Stage: 'Closed Won',
        Amount: orderData.totalAmount,
        Closing_Date: orderData.orderDate.toISOString().split('T')[0],
        Custom_Fields: {
          Order_ID: orderData.orderId,
          Transaction_ID: orderData.transactionId,
          FFL_Dealer_ID: orderData.fflDealerId,
          Order_Items: JSON.stringify(orderData.items)
        }
      }]
    };

    const response = await this.makeRequest('POST', '/crm/v6/Deals', zohoDeal);
    return response.data[0].details.id;
  }

  async getCustomerOrders(zohoCustomerId: string): Promise<any[]> {
    const response = await this.makeRequest('GET', `/crm/v6/Deals/search?criteria=Contact_Name:equals:${zohoCustomerId}`);
    return response.data || [];
  }

  // FFL Vendor Management
  async createFFLVendor(fflData: FFLVendorData): Promise<string> {
    const zohoVendor = {
      data: [{
        Vendor_Name: fflData.businessName,
        Email: fflData.email,
        Phone: fflData.phone,
        Street: fflData.address.street,
        City: fflData.address.city,
        State: fflData.address.state,
        Zip_Code: fflData.address.zipCode,
        Custom_Fields: {
          FFL_Number: fflData.fflNumber,
          Contact_Name: fflData.contactName,
          Status: fflData.status,
          Specializations: JSON.stringify(fflData.specializations || [])
        }
      }]
    };

    const response = await this.makeRequest('POST', '/crm/v6/Vendors', zohoVendor);
    return response.data[0].details.id;
  }

  async updateFFLVendor(zohoVendorId: string, fflData: Partial<FFLVendorData>): Promise<void> {
    const updateData = {
      data: [{
        id: zohoVendorId,
        Vendor_Name: fflData.businessName,
        Email: fflData.email,
        Phone: fflData.phone,
        Street: fflData.address?.street,
        City: fflData.address?.city,
        State: fflData.address?.state,
        Zip_Code: fflData.address?.zipCode,
        Custom_Fields: {
          FFL_Number: fflData.fflNumber,
          Contact_Name: fflData.contactName,
          Status: fflData.status,
          Specializations: JSON.stringify(fflData.specializations || [])
        }
      }]
    };

    await this.makeRequest('PUT', '/crm/v6/Vendors', updateData);
  }

  async searchFFLVendors(criteria: { state?: string; zipCode?: string; fflNumber?: string }): Promise<any[]> {
    let searchQuery = '';
    
    if (criteria.fflNumber) {
      searchQuery = `FFL_Number:equals:${criteria.fflNumber}`;
    } else if (criteria.state) {
      searchQuery = `State:equals:${criteria.state}`;
    }

    const response = await this.makeRequest('GET', `/crm/v6/Vendors/search?criteria=${searchQuery}`);
    return response.data || [];
  }

  // Support Ticket Management (if using Zoho Desk)
  async createSupportTicket(ticketData: {
    customerId: string;
    subject: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    category?: string;
  }): Promise<string> {
    // This would integrate with Zoho Desk API
    const ticket = {
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority,
      contactId: ticketData.customerId,
      category: ticketData.category || 'General'
    };

    const response = await axios.post(`https://desk.zoho.${this.config.region}/api/v1/tickets`, ticket, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.id;
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/crm/v6/org');
      return !!response.org;
    } catch (error) {
      console.error('Zoho connection test failed:', error);
      return false;
    }
  }

  // Batch Operations
  async batchOperation(operations: Array<{
    method: string;
    url: string;
    data?: any;
  }>): Promise<any[]> {
    // Use Zoho Composite API for batch operations
    const batchRequest = {
      composite_request: operations.map((op, index) => ({
        method: op.method,
        url: op.url,
        data: op.data,
        reference_id: `req_${index}`
      }))
    };

    const response = await this.makeRequest('POST', '/crm/v6/composite', batchRequest);
    return response.composite_response;
  }
}

// Configuration using environment variables
export async function createZohoService(): Promise<ZohoService | null> {
  try {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;
    
    if (!clientId || !clientSecret) {
      console.warn("Zoho credentials not configured");
      return null;
    }

    const config: ZohoConfig = {
      clientId,
      clientSecret,
      redirectUri,
      region: 'com' as any,
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    };

    console.log('✅ Creating Zoho service with credentials:', { clientId: clientId.substring(0, 10) + '...', hasClientSecret: !!clientSecret });
    return new ZohoService(config);
  } catch (error) {
    console.error('Error creating Zoho service:', error);
    return null;
  }
}