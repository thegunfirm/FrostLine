import express from 'express';
import passport from 'passport';
import { createSamlStrategy, validateSamlConfig } from './saml-config';
import type { Request, Response, NextFunction } from 'express';

// Extend session interface for SAML properties
declare module 'express-session' {
  interface SessionData {
    samlRelayState?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      roles: string[];
      samlSessionIndex?: string;
      samlIssuer?: string;
      loginMethod: string;
      loginTime: Date;
    };
    isAuthenticated?: boolean;
    authMethod?: string;
  }
}

const router = express.Router();

// Initialize SAML strategy if configuration is valid
if (validateSamlConfig()) {
  passport.use('saml', createSamlStrategy());
}

// Middleware to check if SAML is properly configured
const requireSamlConfig = (req: Request, res: Response, next: NextFunction) => {
  if (!validateSamlConfig()) {
    return res.status(503).json({ 
      error: 'SAML authentication not configured',
      message: 'Please configure SAML environment variables'
    });
  }
  next();
};

// SAML Authentication Routes

/**
 * GET /sso/saml/login
 * Initiates SAML authentication flow
 * Redirects to Zoho Directory IdP with RelayState
 */
router.get('/login', requireSamlConfig, (req: Request, res: Response, next: NextFunction) => {
  // Capture the original destination URL for RelayState
  const relayState = req.query.returnTo as string || req.get('Referer') || '/';
  
  console.log('🔐 Initiating SAML login, RelayState:', relayState);
  
  // Store RelayState in session for later retrieval
  req.session.samlRelayState = relayState;
  
  passport.authenticate('saml')(req, res, next);
});

/**
 * POST /sso/saml/acs
 * Assertion Consumer Service - handles SAML Response from IdP
 * Verifies signature and creates user session
 */
router.post('/acs', requireSamlConfig, (req: Request, res: Response, next: NextFunction) => {
  console.log('🔐 Received SAML assertion at ACS endpoint');
  
  passport.authenticate('saml', (err: any, user: any, info: any) => {
    if (err) {
      console.error('❌ SAML authentication error:', err);
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'SAML assertion validation failed',
        details: err.message
      });
    }
    
    if (!user) {
      console.error('❌ SAML authentication failed - no user returned');
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid SAML assertion or user not authorized'
      });
    }
    
    // Log successful authentication (without PII beyond basics)
    console.log('✅ SAML authentication successful:', {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      issuer: user.samlIssuer,
      loginTime: user.loginTime.toISOString()
    });
    
    // Create user session
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Session creation failed:', loginErr);
        return res.status(500).json({ 
          error: 'Session creation failed',
          message: 'Unable to create user session'
        });
      }
      
      // Store user in session with extended information
      req.session.user = user;
      req.session.isAuthenticated = true;
      req.session.authMethod = 'saml';
      
      // Determine redirect destination
      const relayState = req.body.RelayState || req.session.samlRelayState || '/';
      
      // Clear stored RelayState
      delete req.session.samlRelayState;
      
      console.log('🔐 SAML session created, redirecting to:', relayState);
      
      // Redirect to original destination or home
      res.redirect(relayState);
    });
  })(req, res, next);
});

/**
 * GET /sso/saml/metadata
 * Returns SP metadata for IdP configuration
 */
router.get('/metadata', requireSamlConfig, (req: Request, res: Response) => {
  try {
    const strategy = passport.use('saml') as any;
    if (!strategy) {
      return res.status(500).json({ error: 'SAML strategy not initialized' });
    }
    
    // Generate basic SP metadata without certificates (can be enhanced later)
    const spEntityId = process.env.SAML_SP_ENTITY_ID || 'urn:thegunfirm:cms';
    const acsUrl = process.env.SAML_SP_ASSERTION_CONSUMER || 'https://app.thegunfirm.com/sso/saml/acs';
    
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${spEntityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="1"/>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
    
    res.type('application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('❌ Failed to generate SP metadata:', error);
    res.status(500).json({ 
      error: 'Failed to generate metadata',
      message: (error as Error).message
    });
  }
});

/**
 * POST /sso/saml/slo
 * Single Logout endpoint (optional - for future implementation)
 */
router.post('/slo', requireSamlConfig, (req: Request, res: Response) => {
  console.log('🔐 SAML Single Logout requested');
  
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction failed:', err);
    }
    
    // Redirect to login or home page
    res.redirect('/login');
  });
});

/**
 * GET /sso/saml/logout
 * Initiates SAML logout flow
 */
router.get('/logout', requireSamlConfig, (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  
  console.log('🔐 Initiating SAML logout for user:', (req.user as any).email);
  
  // Simple local logout (SLO can be enhanced later)
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destruction failed:', err);
    }
    res.redirect('/login');
  });
});

/**
 * GET /sso/saml/status
 * Returns SAML configuration status for debugging
 */
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = validateSamlConfig();
  const hasUser = !!req.session?.user;
  
  res.json({
    configured: isConfigured,
    authenticated: hasUser,
    authMethod: req.session?.authMethod,
    user: hasUser ? {
      email: req.session.user.email,
      roles: req.session.user.roles,
      loginTime: req.session.user.loginTime
    } : null,
    endpoints: {
      login: '/sso/saml/login',
      acs: '/sso/saml/acs',
      metadata: '/sso/saml/metadata',
      logout: '/sso/saml/logout',
      status: '/sso/saml/status'
    }
  });
});

export default router;