# Zoho Directory SAML Configuration Fix

## Current Issue
Zoho Directory SAML app is configured for production domain (`thegunfirm.com`) but we're testing on development domain (`4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev`).

## Solution: Update Zoho Directory SAML App

### Step 1: Access Zoho Directory Admin Console
1. Go to https://directory.zoho.com/
2. Login as admin
3. Navigate to "Apps" → "Custom Apps" → "TGF CMS SAML"

### Step 2: Update SAML Configuration
Update these fields in the SAML app:

**Current Configuration (Production):**
- SP Entity ID: `urn:thegunfirm:cms`
- ACS URL: `https://app.thegunfirm.com/sso/saml/acs`

**Required Configuration (Development):**
- SP Entity ID: `urn:thegunfirm:cms` (keep same)
- ACS URL: `https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/sso/saml/acs`

### Step 3: Verify Configuration
After updating, test the SAML login at:
https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/staff-login

## Alternative: Domain Redirection

If you prefer not to modify Zoho Directory for testing, you can:

1. Set up DNS to point `app.thegunfirm.com` to this Replit instance
2. Configure Replit custom domain
3. Test using the production domain

However, updating Zoho Directory is easier for development testing.

## Current Replit Domain
```
4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev
```

## SAML Endpoints
- Login: `/sso/saml/login`
- ACS: `/sso/saml/acs`
- Metadata: `/sso/saml/metadata`
- Status: `/sso/saml/status`