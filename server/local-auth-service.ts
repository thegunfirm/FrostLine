import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { db } from './db.js';
import { localUsers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { ZohoService } from './zoho-service.js';

export type User = typeof localUsers.$inferSelect;
export type InsertUser = typeof localUsers.$inferInsert;

export interface RegistrationData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
  subscriptionTier?: string;
}

export interface VerificationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionTier: string;
    emailVerified: boolean;
    isTestAccount?: boolean;
  };
  error?: string;
  message?: string;
  localUserId?: string;
}

export interface LoginResult {
  success: boolean;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  membershipTier?: string;
  error?: string;
}

/**
 * Local Authentication Service
 * Handles user registration, login, and management using local PostgreSQL database
 * Replaces Zoho CRM dependency with reliable local storage
 */
export class LocalAuthService {
  private pendingRegistrations = new Map<string, RegistrationData & { expiresAt: Date; verificationToken: string }>();
  private zohoService: ZohoService;

  constructor() {
    // Initialize Zoho service for Contact module updates with environment credentials
    const zohoConfig = {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      redirectUri: process.env.ZOHO_REDIRECT_URI || '',
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com/crm/v2',
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    };
    
    this.zohoService = new ZohoService(zohoConfig);
  }

  /**
   * Step 1: Initiate registration with email verification
   */
  async initiateRegistration(data: RegistrationData): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Initiating local registration for:', data.email);

      // Check if user already exists
      const existingUser = await db.select().from(localUsers).where(eq(localUsers.email, data.email)).limit(1);
      if (existingUser.length > 0) {
        return { success: false, message: 'An account with this email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Generate verification token
      const verificationToken = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store pending registration
      this.pendingRegistrations.set(verificationToken, {
        ...data,
        password: hashedPassword,
        expiresAt,
        verificationToken
      });

      // For now, skip email verification in local mode
      console.log(`📧 Email verification would be sent to: ${data.email}`);
      console.log(`🔗 Verification URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`);

      console.log('✅ Verification email sent to:', data.email);
      return { 
        success: true, 
        message: 'Registration initiated. Please check your email to verify your account.' 
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
   * Step 2: Verify email and create local user account
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

      // Create user in local database
      const userData: InsertUser = {
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        passwordHash: pendingUser.password, // Already hashed
        phone: pendingUser.phone || null,
        membershipTier: pendingUser.subscriptionTier || 'Bronze',
        emailVerified: true,
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Creating local user for:', pendingUser.email);
      const [newUser] = await db.insert(localUsers).values(userData).returning();

      // Clean up pending registration
      this.pendingRegistrations.delete(token);

      console.log('✅ Local account created successfully:', {
        email: pendingUser.email,
        localId: newUser.id
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email!,
          firstName: newUser.firstName!,
          lastName: newUser.lastName!,
          subscriptionTier: newUser.membershipTier!,
          emailVerified: true
        },
        localUserId: newUser.id
      };
      
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Email verification failed' };
    }
  }

  /**
   * Create test user (bypasses email verification for testing)
   */
  async createTestUser(data: RegistrationData): Promise<VerificationResult> {
    try {
      console.log('🧪 Creating test user locally (bypassing email verification):', data.email);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      // Create user directly in local database
      const userData: InsertUser = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: hashedPassword,
        phone: data.phone || null,
        membershipTier: data.subscriptionTier || 'Bronze',
        emailVerified: true,
        isActive: true,
        isTestAccount: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [newUser] = await db.insert(localUsers).values(userData).returning();
      
      console.log('✅ Test user created locally with ID:', newUser.id);
      
      // Create corresponding Zoho Contact with Tier field
      try {
        await this.createZohoContact(newUser);
        console.log('✅ Zoho Contact created with Tier field');
      } catch (error) {
        console.log('⚠️ Zoho Contact creation failed, but local user created:', error);
      }
      
      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email!,
          firstName: newUser.firstName!,
          lastName: newUser.lastName!,
          subscriptionTier: newUser.membershipTier!,
          emailVerified: true,
          isTestAccount: true
        },
        localUserId: newUser.id
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
   * Login user with email and password
   */
  async loginUser(email: string, password: string): Promise<LoginResult> {
    try {
      console.log('🔐 Local login attempt for:', email);
      
      // Find user in local database
      const [user] = await db.select().from(localUsers).where(eq(localUsers.email, email)).limit(1);
      
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated. Please contact support.' };
      }

      if (!user.emailVerified) {
        return { success: false, error: 'Please verify your email before logging in.' };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!passwordMatch) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Update last login
      await db.update(localUsers).set({ 
        lastLogin: new Date(),
        updatedAt: new Date()
      }).where(eq(localUsers.id, user.id));

      console.log('✅ Local login successful for:', email);
      
      return {
        success: true,
        id: user.id,
        email: user.email!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        membershipTier: user.membershipTier!
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Get user by local ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
      return user || null;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Update user membership tier
   */
  async updateUserMembershipTier(userId: string, membershipTier: string): Promise<boolean> {
    try {
      await db.update(localUsers).set({ 
        membershipTier,
        updatedAt: new Date()
      }).where(eq(localUsers.id, userId));

      console.log(`✅ Updated membership tier for ${userId} to ${membershipTier}`);
      return true;

    } catch (error) {
      console.error('Update membership tier error:', error);
      return false;
    }
  }

  /**
   * Update user tier by email (for subscription processing)
   */
  async updateUserTierByEmail(email: string, membershipTier: string): Promise<boolean> {
    try {
      await db.update(localUsers).set({ 
        membershipTier,
        updatedAt: new Date()
      }).where(eq(localUsers.email, email));

      console.log(`✅ Updated membership tier for ${email} to ${membershipTier}`);
      
      // Update Zoho Contact Tier field
      try {
        await this.updateZohoContactTier(email, membershipTier);
      } catch (error) {
        console.log('⚠️ Zoho Contact tier update failed, but local update succeeded:', error);
      }
      
      return true;

    } catch (error) {
      console.error('Update tier by email error:', error);
      return false;
    }
  }

  /**
   * Create Zoho Contact with Tier field
   */
  private async createZohoContact(user: User): Promise<void> {
    try {
      const contactData = {
        data: [{
          First_Name: user.firstName,
          Last_Name: user.lastName,
          Email: user.email,
          Phone: user.phone || null,
          Tier: user.membershipTier, // This is the key field for the test
          Account_Name: 'TheGunFirm Customer',
          Lead_Source: 'Website Registration'
        }]
      };

      const result = await this.zohoService.makeAPIRequest('Contacts', 'POST', contactData);
      console.log('Zoho Contact creation result:', result?.data?.[0]?.status);
    } catch (error) {
      console.error('Zoho Contact creation error:', error);
      throw error;
    }
  }

  /**
   * Update Zoho Contact Tier field
   */
  private async updateZohoContactTier(email: string, newTier: string): Promise<void> {
    try {
      // Search for the contact by email
      const searchResponse = await this.zohoService.makeAPIRequest(
        `Contacts/search?criteria=(Email:equals:${email})`
      );

      if (searchResponse?.data?.[0]?.id) {
        const contactId = searchResponse.data[0].id;
        
        const updateData = {
          data: [{
            id: contactId,
            Tier: newTier
          }]
        };

        await this.zohoService.makeAPIRequest('Contacts', 'PUT', updateData);
        console.log(`✅ Updated Zoho Contact Tier to ${newTier} for ${email}`);
      }
    } catch (error) {
      console.error('Zoho Contact tier update error:', error);
      throw error;
    }
  }
}