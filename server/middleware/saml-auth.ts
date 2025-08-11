import type { Request, Response, NextFunction } from 'express';

/**
 * SAML Authentication Middleware
 * Checks if user is authenticated via SAML and has required roles
 */

export interface SamlUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  samlSessionIndex?: string;
  samlIssuer?: string;
  loginMethod: string;
  loginTime: Date;
}

/**
 * Middleware to check if user is authenticated via SAML
 */
export const requireSamlAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user || req.session.authMethod !== 'saml') {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate via SAML to access this resource',
      redirectTo: '/sso/saml/login'
    });
  }
  
  next();
};

/**
 * Middleware to check if authenticated user has required role(s)
 * @param allowedRoles - Array of roles that can access the resource
 */
export const requireSamlRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First check if user is authenticated
    if (!req.session?.user || req.session.authMethod !== 'saml') {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate via SAML to access this resource',
        redirectTo: '/sso/saml/login'
      });
    }
    
    const user = req.session.user as SamlUser;
    const userRoles = user.roles || [];
    
    // Check if user has any of the required roles
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        userRoles: userRoles
      });
    }
    
    next();
  };
};

/**
 * Middleware to check admin access (admin or tech roles)
 */
export const requireAdminRole = requireSamlRole(['admin', 'tech']);

/**
 * Middleware to check support access (any staff role)
 */
export const requireStaffRole = requireSamlRole(['admin', 'tech', 'support', 'billing', 'manager']);

/**
 * Helper function to get current SAML user from request
 */
export const getCurrentSamlUser = (req: Request): SamlUser | null => {
  if (!req.session?.user || req.session.authMethod !== 'saml') {
    return null;
  }
  
  return req.session.user as SamlUser;
};

/**
 * Helper function to check if user has specific role
 */
export const userHasRole = (req: Request, role: string): boolean => {
  const user = getCurrentSamlUser(req);
  return user ? user.roles.includes(role) : false;
};

/**
 * Middleware to log SAML authentication events
 */
export const logSamlAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentSamlUser(req);
  
  if (user) {
    console.log(`🔐 SAML Access: ${user.email} (${user.roles.join(',')}) → ${req.method} ${req.path}`);
  }
  
  next();
};