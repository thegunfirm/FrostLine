import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ZohoService } from './zoho-service';
// Email service will be imported dynamically when needed

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  subscriptionTier?: string;
}

export interface VerificationResult {
  success: boolean;
  user?: any;
  zohoContactId?: string;
  error?: string;
}

export class AuthService {
  private zohoService: ZohoService;
  private pendingRegistrations = new Map(); // In production, use Redis or database

  constructor() {
    const config = {
      clientId: process.env.ZOHO_CLIENT_ID || '1000.8OVSJ4V07OOVJWYAC0KA1JEFNH2W3M',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '4d4b2ab7f0f731102c7d15d6754f1f959251db68e0',
      redirectUri: 'https://placeholder.com', // Not needed for service calls
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com'
    };
    this.zohoService = new ZohoService(config);
    
    // Set up access token if available
    const accessToken = process.env.ZOHO_ACCESS_TOKEN;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    if (accessToken) {
      this.zohoService.setTokens(accessToken, refreshToken);
    }
  }

  /**
   * Step 1: Register user and send verification email
   */
  async initiateRegistration(data: RegistrationData): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email already exists in Zoho CRM (if we have access tokens)
      if (this.zohoService.accessToken) {
        const existingContact = await this.zohoService.findContactByEmail(data.email);
        if (existingContact) {
          return { success: false, message: 'Email address is already registered. Please try logging in instead.' };
        }
      }
      
      // Also check if email is already in pending registrations
      for (const [token, pendingReg] of this.pendingRegistrations) {
        if (pendingReg.email === data.email && new Date() < pendingReg.expiresAt) {
          return { success: false, message: 'Email address already has a pending registration. Please check your email for the verification link.' };
        }
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Store pending registration
      this.pendingRegistrations.set(verificationToken, {
        ...data,
        password: hashedPassword,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // Send verification email
      const { sendVerificationEmail } = await import('./services/email-service');
      await sendVerificationEmail(data.email, verificationToken, data.firstName);

      return { 
        success: true, 
        message: 'Registration initiated. Please check your email for verification.' 
      };

    } catch (error) {
      console.error('Registration initiation error:', error);
      return { 
        success: false, 
        message: 'Registration failed. Please try again.' 
      };
    }
  }

  /**
   * Step 2: Verify email and create Zoho contact
   */
  async verifyEmailAndCreateAccount(token: string): Promise<VerificationResult> {
    try {
      // Get pending registration
      const pendingUser = this.pendingRegistrations.get(token);
      if (!pendingUser) {
        return { success: false, error: 'Invalid or expired verification token' };
      }

      // Check expiration
      if (new Date() > pendingUser.expiresAt) {
        this.pendingRegistrations.delete(token);
        return { success: false, error: 'Verification token has expired' };
      }

      // Create contact in Zoho CRM
      const contactData = {
        First_Name: pendingUser.firstName,
        Last_Name: pendingUser.lastName,
        Email: pendingUser.email,
        Phone: pendingUser.phone || null,
        Account_Name: `${pendingUser.firstName} ${pendingUser.lastName}`,
        Lead_Source: 'Website Registration',
        Description: `User registered on ${new Date().toISOString()}`,
        // Custom fields
        Subscription_Tier: pendingUser.subscriptionTier || 'Bronze',
        Email_Verified: true,
        Registration_Date: new Date().toISOString().split('T')[0],
        Password_Hash: pendingUser.password, // Store securely in custom field
        Account_Status: 'Active'
      };

      console.log('Creating Zoho contact for:', pendingUser.email);
      const zohoContact = await this.zohoService.createContact(contactData);

      // Clean up pending registration
      this.pendingRegistrations.delete(token);

      console.log('✅ Account created successfully:', {
        email: pendingUser.email,
        zohoId: zohoContact.id
      });

      return {
        success: true,
        user: {
          id: zohoContact.id,
          email: pendingUser.email,
          firstName: pendingUser.firstName,
          lastName: pendingUser.lastName,
          subscriptionTier: pendingUser.subscriptionTier || 'Bronze',
          emailVerified: true
        },
        zohoContactId: zohoContact.id
      };
      
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Email verification failed' };
    }
  }

  /**
   * TEST HELPER: Skip email verification and create user directly in Zoho
   * This bypasses email verification for testing purposes
   */
  async createTestUser(data: RegistrationData): Promise<VerificationResult> {
    try {
      console.log('🧪 Creating test user (bypassing email verification):', data.email);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      // Create user in Zoho CRM if access token is available
      if (!this.zohoService.accessToken) {
        console.log('⚠️  No Zoho access token - cannot create test user in CRM');
        return { success: false, error: 'No Zoho access token available for test user creation. Please configure ZOHO_ACCESS_TOKEN and ZOHO_REFRESH_TOKEN secrets.' };
      }
      
      // Store additional data as JSON in Description field since custom fields may not be accessible
      const additionalData = {
        passwordHash: hashedPassword,
        subscriptionTier: data.subscriptionTier || 'Bronze',
        emailVerified: true,
        registrationDate: new Date().toISOString().split('T')[0],
        accountStatus: 'Active - Test Account',
        accountType: 'Test',
        createdOn: new Date().toISOString()
      };

      const zohoContactData = {
        Email: data.email,
        First_Name: data.firstName,
        Last_Name: data.lastName,
        Phone: data.phone || '',
        Lead_Source: 'Test Registration',
        Description: JSON.stringify(additionalData)
      };
      
      // Direct API call bypassing ZohoService to avoid version issues
      const response = await fetch('https://www.zohoapis.com/crm/v6/Contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [zohoContactData]
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.data || result.data[0].status !== 'success') {
        throw new Error(`Zoho contact creation failed: ${JSON.stringify(result)}`);
      }
      
      const zohoContact = {
        id: result.data[0].details.id,
        ...zohoContactData
      };
      console.log('✅ Test user created in Zoho CRM with ID:', zohoContact.id);
      
      return {
        success: true,
        user: {
          id: zohoContact.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          subscriptionTier: data.subscriptionTier || 'Bronze',
          emailVerified: true,
          isTestAccount: true
        },
        zohoContactId: zohoContact.id
      };
      
    } catch (error: any) {
      console.error('❌ Test user creation error:', error);
      return { 
        success: false, 
        error: error?.message || 'Test user creation failed' 
      };
    }
  }

  /**
   * Verify email token and activate user account
   */
  async verifyEmail(token: string): Promise<VerificationResult> {
    try {
      // Find pending registration by token
      const pendingReg = this.pendingRegistrations.get(token);
      if (!pendingReg) {
        return { success: false, error: 'Invalid or expired verification token' };
      }

      // Create user in Zoho CRM
      const zohoContactData = {
        Email: pendingReg.email,
        First_Name: pendingReg.firstName,
        Last_Name: pendingReg.lastName,
        Password_Hash: pendingReg.hashedPassword,
        Subscription_Tier: pendingReg.subscriptionTier,
        Preferred_FFL: pendingReg.preferredFfl,
        Registration_Date: new Date().toISOString().split('T')[0],
        Account_Status: 'Active',
        Email_Verified: true
      };

      const zohoContact = await this.zohoService.createContact(zohoContactData);
      
      // Remove pending registration
      this.pendingRegistrations.delete(token);
      
      return {
        success: true,
        user: {
          id: zohoContact.id,
          email: pendingReg.email,
          firstName: pendingReg.firstName,
          lastName: pendingReg.lastName,
          subscriptionTier: pendingReg.subscriptionTier,
          emailVerified: true
        },
        zohoContactId: zohoContact.id
      };

    } catch (error) {
      console.error('Email verification error:', error);
      return { 
        success: false, 
        error: 'Verification failed. Please try registering again.' 
      };
    }
  }

  /**
   * User login - authenticate against Zoho contact
   */
  async loginUser(email: string, password: string): Promise<VerificationResult> {
    try {
      // Find contact in Zoho using direct API call
      const searchResponse = await fetch(`https://www.zohoapis.com/crm/v6/Contacts/search?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        }
      });
      
      let searchResult;
      try {
        const responseText = await searchResponse.text();
        console.log('Raw Zoho search response:', responseText);
        
        if (!responseText.trim()) {
          console.log('Empty response from Zoho search');
          return { success: false, error: 'Invalid email or password' };
        }
        
        searchResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return { success: false, error: 'Invalid email or password' };
      }
      
      if (!searchResponse.ok || !searchResult.data || searchResult.data.length === 0) {
        console.log('No contact found or API error:', searchResult);
        return { success: false, error: 'Invalid email or password' };
      }
      
      const contact = searchResult.data[0];

      // Parse additional data from Description field
      let additionalData;
      try {
        additionalData = JSON.parse(contact.Description || '{}');
      } catch (e) {
        return { success: false, error: 'Invalid account data. Please contact support.' };
      }

      // Verify password (stored in Description JSON)
      const storedHash = additionalData.passwordHash;
      if (!storedHash) {
        return { success: false, error: 'Account needs to be reset. Please contact support.' };
      }

      const passwordMatch = await bcrypt.compare(password, storedHash);
      if (!passwordMatch) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if email is verified
      if (!additionalData.emailVerified) {
        return { success: false, error: 'Please verify your email before logging in' };
      }

      return {
        success: true,
        user: {
          id: contact.id,
          email: contact.Email,
          firstName: contact.First_Name,
          lastName: contact.Last_Name,
          subscriptionTier: additionalData.subscriptionTier || 'Bronze',
          emailVerified: additionalData.emailVerified,
          zohoContactId: contact.id
        },
        zohoContactId: contact.id
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Get user by Zoho contact ID
   */
  async getUserByZohoId(zohoContactId: string): Promise<any | null> {
    try {
      const contact = await this.zohoService.getContact(zohoContactId);
      if (!contact) return null;

      return {
        id: contact.id,
        email: contact.Email,
        firstName: contact.First_Name,
        lastName: contact.Last_Name,
        subscriptionTier: contact.Subscription_Tier || 'Bronze',
        emailVerified: contact.Email_Verified,
        zohoContactId: contact.id
      };
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Update user subscription tier
   */
  async updateUserTier(zohoContactId: string, tier: string): Promise<boolean> {
    try {
      await this.zohoService.updateContact(zohoContactId, {
        Subscription_Tier: tier,
        Tier_Updated_Date: new Date().toISOString().split('T')[0]
      });
      return true;
    } catch (error) {
      console.error('Update tier error:', error);
      return false;
    }
  }

  /**
   * Update user membership tier (FAP integration)
   */
  async updateUserMembershipTier(zohoContactId: string, membershipTier: string): Promise<boolean> {
    try {
      // Get current contact to preserve additional data
      const contact = await this.getUserByZohoId(zohoContactId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Update using direct API call to preserve JSON structure
      const updateResponse = await fetch(`https://www.zohoapis.com/crm/v6/Contacts/${zohoContactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [{
            id: zohoContactId,
            Description: JSON.stringify({
              ...JSON.parse(contact.description || '{}'),
              subscriptionTier: membershipTier,
              tierUpdatedDate: new Date().toISOString(),
              lastPaymentDate: new Date().toISOString()
            })
          }]
        })
      });

      const result = await updateResponse.json();
      
      if (!updateResponse.ok || !result.data || result.data[0].status !== 'success') {
        throw new Error(`Zoho update failed: ${JSON.stringify(result)}`);
      }

      console.log(`✅ Updated membership tier for ${zohoContactId} to ${membershipTier}`);
      return true;

    } catch (error) {
      console.error('Update membership tier error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();