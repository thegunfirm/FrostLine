import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ZohoService } from './zoho-service';
import { sendVerificationEmail } from './email-service';

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
      for (const [token, pendingReg] of this.pendingRegistrations.entries()) {
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
      
      const zohoContactData = {
        Email: data.email,
        First_Name: data.firstName,
        Last_Name: data.lastName,
        Phone: data.phone || '',
        Account_Name: `${data.firstName} ${data.lastName}`,
        Lead_Source: 'Test Registration',
        Description: `Test user created on ${new Date().toISOString()}`,
        Subscription_Tier: data.subscriptionTier || 'Bronze',
        Password_Hash: hashedPassword,
        Email_Verified: true,
        Registration_Date: new Date().toISOString().split('T')[0],
        Account_Status: 'Active - Test Account',
        Account_Type: 'Test'
      };
      
      const zohoContact = await this.zohoService.createContact(zohoContactData);
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
      
    } catch (error) {
      console.error('❌ Test user creation error:', error);
      return { 
        success: false, 
        error: error.message || 'Test user creation failed' 
      };
    }
  }
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
      // Find contact in Zoho
      const contact = await this.zohoService.findContactByEmail(email);
      if (!contact) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password (stored in custom field)
      const storedHash = contact.Password_Hash;
      if (!storedHash) {
        return { success: false, error: 'Account needs to be reset. Please contact support.' };
      }

      const passwordMatch = await bcrypt.compare(password, storedHash);
      if (!passwordMatch) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if email is verified
      if (!contact.Email_Verified) {
        return { success: false, error: 'Please verify your email before logging in' };
      }

      return {
        success: true,
        user: {
          id: contact.id,
          email: contact.Email,
          firstName: contact.First_Name,
          lastName: contact.Last_Name,
          subscriptionTier: contact.Subscription_Tier || 'Bronze',
          emailVerified: contact.Email_Verified,
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
}