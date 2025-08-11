import { Strategy as SamlStrategy } from 'passport-saml';
import type { Profile, VerifiedCallback } from 'passport-saml';

// Extend Profile type to include attributes
interface ExtendedProfile extends Profile {
  attributes?: {
    email?: string[];
    firstName?: string[];
    lastName?: string[];
    groups?: string[];
    Department?: string[];
  };
}

// SAML configuration for Zoho Directory IdP
export const samlConfig = {
  // Service Provider (SP) settings - TheGunFirm CMS
  issuer: process.env.SAML_SP_ENTITY_ID || 'urn:thegunfirm:cms',
  callbackUrl: process.env.SAML_SP_ASSERTION_CONSUMER || `https://${process.env.REPLIT_DEV_DOMAIN || 'app.thegunfirm.com'}/sso/saml/acs`,
  
  // Identity Provider (IdP) settings - Zoho Directory
  entryPoint: process.env.SAML_IDP_SSO_URL,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  
  // Security settings
  wantAssertionsSigned: process.env.SAML_REQUIRE_SIGNED_ASSERTIONS === 'true',
  acceptedClockSkewMs: parseInt(process.env.SAML_CLOCK_SKEW_SEC || '300') * 1000,
  
  // Certificate validation
  cert: process.env.SAML_IDP_CERT_PEM || '',
  
  // Protocol binding
  protocol: 'https://',
  
  // Additional security
  disableRequestedAuthnContext: true,
  
  // Logout URL (optional for day-1)
  logoutUrl: process.env.SAML_IDP_SLO_URL,
  logoutCallbackUrl: process.env.SAML_SP_SLO_URL || 'https://app.thegunfirm.com/sso/saml/slo'
};

// Map Zoho Directory groups to CMS roles
export const mapGroupsToRoles = (groups: string[]): string[] => {
  const roleMapping: Record<string, string> = {
    'TGF.Support': 'support',
    'TGF.Manager': 'manager',
    'TGF.Admin': 'admin'
  };

  const roles: string[] = [];
  
  for (const group of groups) {
    const role = roleMapping[group.trim()];
    if (role && !roles.includes(role)) {
      roles.push(role);
    }
  }
  
  // Default role if no groups match
  if (roles.length === 0) {
    roles.push('support');
  }
  
  return roles;
};

// SAML profile verification function
export const verifySamlProfile = async (
  profile: Profile | null | undefined, 
  done: VerifiedCallback
): Promise<void> => {
  try {
    if (!profile) {
      return done(new Error('No SAML profile received'));
    }

    const extendedProfile = profile as ExtendedProfile;

    console.log('🔐 SAML Profile received:', {
      nameID: extendedProfile.nameID,
      nameIDFormat: extendedProfile.nameIDFormat,
      issuer: extendedProfile.issuer,
      sessionIndex: extendedProfile.sessionIndex,
      attributes: extendedProfile.attributes
    });

    // Extract user information from SAML assertion
    const email = extendedProfile.nameID || extendedProfile.attributes?.email?.[0];
    const firstName = extendedProfile.attributes?.firstName?.[0] || '';
    const lastName = extendedProfile.attributes?.lastName?.[0] || '';
    const groups = extendedProfile.attributes?.groups || extendedProfile.attributes?.Department || [];
    
    if (!email) {
      console.error('❌ SAML assertion missing required email');
      return done(new Error('Email is required from SAML assertion'));
    }

    // Map groups to application roles
    const roles = mapGroupsToRoles(Array.isArray(groups) ? groups : [groups]);
    
    // Create user object for session
    const user = {
      id: email, // Use email as unique identifier
      email,
      firstName,
      lastName,
      roles,
      samlSessionIndex: extendedProfile.sessionIndex,
      samlIssuer: extendedProfile.issuer,
      loginMethod: 'saml',
      loginTime: new Date()
    };

    console.log('✅ SAML user authenticated:', {
      email: user.email,
      roles: user.roles,
      sessionIndex: user.samlSessionIndex
    });

    return done(null, user);
    
  } catch (error) {
    console.error('❌ SAML profile verification failed:', error);
    return done(error as Error);
  }
};

// Create SAML strategy
export const createSamlStrategy = (): SamlStrategy => {
  return new SamlStrategy(samlConfig, verifySamlProfile);
};

// Validate SAML configuration on startup
export const validateSamlConfig = (): boolean => {
  const required = [
    'SAML_IDP_SSO_URL',
    'SAML_IDP_CERT_PEM'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  SAML configuration incomplete. Missing:', missing.join(', '));
    return false;
  }

  console.log('✅ SAML configuration validated');
  return true;
};