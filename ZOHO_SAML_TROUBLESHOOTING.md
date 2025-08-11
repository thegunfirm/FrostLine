# Zoho Directory SAML Troubleshooting Guide

## Current Issue: "accounts.zoho.com refused to connect"

### Root Cause Analysis

The error indicates that the browser is being redirected to `accounts.zoho.com` which is refusing the connection. However, our SAML configuration is correctly pointing to `directory.zoho.com`.

**Actual Redirect URL (Working):**
```
https://directory.zoho.com/p/896141717/app/1079411000000002069/sso?SAMLRequest=...
```

### Possible Solutions

#### 1. Zoho Directory SAML App Configuration
The SAML app in Zoho Directory needs to be configured with the correct Service Provider settings:

**Required Configuration in Zoho Directory:**
- **SP Entity ID:** `urn:thegunfirm:cms`
- **ACS URL:** `https://[REPLIT_DOMAIN]/sso/saml/acs`
- **NameID Format:** `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
- **Signed Assertions:** Required
- **Binding:** HTTP-POST

#### 2. Browser Security Settings
- Try opening in an incognito/private window
- Disable ad blockers or security extensions
- Check if corporate firewall is blocking the domain

#### 3. Development Environment Setup
For development testing, update the ACS URL to use the current Replit domain:
```
https://[CURRENT_REPLIT_DOMAIN]/sso/saml/acs
```

### Current SAML Configuration Status
✅ SAML environment variables configured
✅ Certificate properly formatted
✅ SSO URL correct for Zoho Directory
✅ SAML endpoints active
✅ ACS URL correctly updated for development environment
⚠️  **ROOT CAUSE IDENTIFIED**: Zoho Directory SAML app configured for production domain only

### Root Cause Analysis
**Current Development Domain:** `4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev`
**Zoho Directory SAML App Domain:** `app.thegunfirm.com` (production only)

**Solution Required:** Add development domain to Zoho Directory SAML app configuration

### Test Steps
1. Verify Zoho Directory SAML app configuration
2. Test SAML login in incognito window
3. Check browser developer console for specific error messages
4. Verify the ACS URL matches between Zoho Directory and our configuration

### SAML Endpoints Available
- **Login:** `/sso/saml/login`
- **ACS:** `/sso/saml/acs`
- **Metadata:** `/sso/saml/metadata`
- **Status:** `/sso/saml/status`
- **Logout:** `/sso/saml/logout`