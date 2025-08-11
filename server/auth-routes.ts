import type { Express } from 'express';
import { AuthService } from './auth-service';
import { sendWelcomeEmail } from './email-service';
import { z } from 'zod';

const authService = new AuthService();

// Validation schemas
const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  subscriptionTier: z.enum(['Bronze', 'Gold', 'Platinum']).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Authentication middleware - checks if user has valid session
 */
export function requireAuth(req: any, res: any, next: any) {
  if (req.session?.user?.zohoContactId) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication required' });
}

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
  
  // POST /api/auth/test-register - Create test user bypassing email verification (for testing only)
  app.post('/api/auth/test-register', async (req, res) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      console.log('🧪 Creating test user:', validatedData.email);
      const result = await authService.createTestUser(validatedData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Test user created successfully in Zoho CRM',
          user: result.user,
          zohoContactId: result.zohoContactId
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || 'Test user creation failed' 
        });
      }
      
    } catch (error: any) {
      console.error('Test registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Test user creation failed. Please try again.' 
      });
    }
  });
  
  // POST /api/auth/register - Initiate registration with email verification
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      const result = await authService.initiateRegistration(validatedData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message,
          step: 'verification_email_sent'
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.message 
        });
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.errors) {
        // Zod validation errors
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
      });
    }
  });

  // GET /api/auth/verify-email?token=... - Verify email and create account
  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Verification token is required' 
        });
      }
      
      const result = await authService.verifyEmailAndCreateAccount(token);
      
      if (result.success && result.user) {
        // Set session
        req.session.user = result.user;
        req.session.save();
        
        // Send welcome email
        await sendWelcomeEmail(
          result.user.email, 
          result.user.firstName, 
          result.user.subscriptionTier
        );
        
        console.log('✅ User account created and logged in:', result.user.email);
        
        res.json({
          success: true,
          message: 'Email verified successfully! Your account is now active.',
          user: result.user,
          step: 'account_created'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Email verification failed'
        });
      }
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.'
      });
    }
  });

  // POST /api/auth/login - User login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const result = await authService.loginUser(validatedData.email, validatedData.password);
      
      if (result.success && result.user) {
        // Set session
        req.session.user = result.user;
        req.session.save();
        
        console.log('✅ User logged in:', result.user.email);
        
        res.json({
          success: true,
          message: 'Login successful',
          user: result.user
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.error || 'Login failed'
        });
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.'
      });
    }
  });

  // POST /api/auth/logout - User logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    });
  });

  // GET /api/auth/me - Get current user
  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    try {
      const user = req.session.user;
      
      // Optionally refresh user data from Zoho
      const currentUser = await authService.getUserByZohoId(user.zohoContactId);
      
      if (currentUser) {
        // Update session with fresh data
        req.session.user = currentUser;
        req.session.save();
        
        res.json({ success: true, user: currentUser });
      } else {
        // User not found, clear session
        req.session.destroy();
        res.status(401).json({ 
          success: false, 
          message: 'User session invalid' 
        });
      }
      
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  });

  // PUT /api/auth/update-tier - Update subscription tier
  app.put('/api/auth/update-tier', requireAuth, async (req: any, res) => {
    try {
      const { tier } = req.body;
      
      if (!['Bronze', 'Gold', 'Platinum'].includes(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier. Must be Bronze, Gold, or Platinum.'
        });
      }
      
      const success = await authService.updateUserTier(req.session.user.zohoContactId, tier);
      
      if (success) {
        // Update session
        req.session.user.subscriptionTier = tier;
        req.session.save();
        
        res.json({
          success: true,
          message: 'Subscription tier updated successfully',
          user: req.session.user
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update subscription tier'
        });
      }
      
    } catch (error: any) {
      console.error('Update tier error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription tier'
      });
    }
  });

}