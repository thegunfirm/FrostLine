import { Express } from 'express';
import { LocalAuthService } from './local-auth-service.js';
import { z } from 'zod';

const localAuthService = new LocalAuthService();

// Validation schemas
const registrationSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  subscriptionTier: z.enum([
    'Bronze', 
    'Gold Monthly', 
    'Gold Annually',
    'Platinum Monthly',
    'Platinum Founder'
  ]).default('Bronze')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

/**
 * Authentication middleware for local users
 */
export function requireLocalAuth(req: any, res: any, next: any) {
  if (req.session?.user?.id) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication required' });
}

/**
 * Register local authentication routes
 */
export function registerLocalAuthRoutes(app: Express) {
  
  // POST /api/auth/register - Start registration process
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      console.log('🔄 Processing registration for:', validatedData.email);
      const result = await localAuthService.initiateRegistration(validatedData);
      
      res.json(result);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: error.errors
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
      });
    }
  });

  // POST /api/auth/verify-email - Verify email and create account
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          error: 'Verification token is required' 
        });
      }

      const result = await localAuthService.verifyEmailAndCreateAccount(token);
      
      if (result.success && result.user) {
        // Set session
        req.session.user = {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          membershipTier: result.user.subscriptionTier,
          emailVerified: true
        };
        
        res.json({ 
          success: true, 
          message: 'Email verified and account created successfully',
          user: result.user
        });
      } else {
        res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Email verification failed. Please try again.' 
      });
    }
  });

  // POST /api/auth/test-register - Create test user (bypassing email verification)
  app.post('/api/auth/test-register', async (req, res) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      console.log('🧪 Creating test user:', validatedData.email);
      const result = await localAuthService.createTestUser(validatedData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Test user created successfully in local database',
          user: result.user,
          localUserId: result.localUserId
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || 'Test user creation failed' 
        });
      }
      
    } catch (error: any) {
      console.error('Test registration error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: error.errors
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Test user creation failed. Please try again.' 
      });
    }
  });

  // POST /api/auth/login - User login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      console.log('🔐 Processing login for:', validatedData.email);
      const result = await localAuthService.loginUser(validatedData.email, validatedData.password);
      
      if (result.success) {
        // Set session
        req.session.user = {
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          membershipTier: result.membershipTier,
          emailVerified: true
        };

        // Return user data without the session details
        res.json({
          success: true,
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          membershipTier: result.membershipTier
        });
      } else {
        res.status(401).json(result);
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email or password format'
        });
      }
      res.status(500).json({ 
        success: false, 
        error: 'Login failed. Please try again.' 
      });
    }
  });

  // POST /api/auth/logout - User logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // GET /api/me - Get current user
  app.get('/api/me', requireLocalAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const user = await localAuthService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        membershipTier: user.membershipTier,
        emailVerified: user.emailVerified,
        lifetimeSavings: user.lifetimeSavings,
        role: user.role
      });
      
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user information' });
    }
  });

  // POST /api/auth/update-tier - Update user membership tier
  app.post('/api/auth/update-tier', async (req, res) => {
    try {
      const { userId, membershipTier, email } = req.body;
      
      let success = false;
      
      if (userId) {
        success = await localAuthService.updateUserMembershipTier(userId, membershipTier);
      } else if (email) {
        success = await localAuthService.updateUserTierByEmail(email, membershipTier);
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Either userId or email is required' 
        });
      }
      
      if (success) {
        // Update session if it's the current user
        if (req.session?.user && (req.session.user.id === userId || req.session.user.email === email)) {
          req.session.user.membershipTier = membershipTier;
        }
        
        res.json({ 
          success: true, 
          message: 'Membership tier updated successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update membership tier' 
        });
      }
      
    } catch (error: any) {
      console.error('Update tier error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update membership tier' 
      });
    }
  });

}