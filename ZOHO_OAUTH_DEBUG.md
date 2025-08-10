# Zoho OAuth "Dummy Loop" Fix Guide

## Current Issue
The OAuth flow is failing with a "dummy loop" error from Zoho.

## Current Configuration
- **Client ID**: `1000.6LDDWN3B3QZM.28e7c6bc3adb57c64026cb2bb3a8c8a3`
- **Client Secret**: `9b9a0b7e38b0c0a47f36ac6c83ad4ce0c52e2f0821`
- **Redirect URI**: `https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/callback`
- **Scopes**: `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`

## Steps to Fix

### Step 1: Verify Zoho App Settings
1. Go to https://api-console.zoho.com
2. Login with your Zoho account
3. Find the app with Client ID: `1000.6LDDWN3B3QZM.28e7c6bc3adb57c64026cb2bb3a8c8a3`
4. Click "Edit" on your app

### Step 2: Fix Redirect URI
In the app settings, ensure the **Redirect URLs** section contains EXACTLY:
```
https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/callback
```

**Important**: The URL must match exactly, including:
- Protocol (https://)
- Domain (4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev)
- Path (/api/zoho/auth/callback)

### Step 3: Verify App Status
- Check if the app is "Published" or "In Development"
- For testing, "In Development" should work
- Ensure the app has the required scopes: `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`

### Step 4: Test Again
After making changes:
1. Save the app settings
2. Wait 5-10 minutes for changes to propagate
3. Try the OAuth URL again: 
   `https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/initiate`

## Alternative: Create New App
If the current app has issues, create a new Zoho app:

1. Go to https://api-console.zoho.com
2. Click "Add Client"
3. Choose "Server-based Applications"
4. Fill in:
   - **Client Name**: TheGunFirm Integration
   - **Homepage URL**: https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev
   - **Redirect URLs**: https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/callback
5. Note the new Client ID and Secret
6. Update the credentials in the CMS Admin → Zoho Integration

## Testing the Fix
Once OAuth is working, I'll immediately create this test account:
- **Name**: Test Account  
- **Email**: zoho.test.verification@thegunfirm.com
- **Phone**: 555-0199
- **Tier**: Bronze Monthly
- **Lead Source**: Website

This will confirm the Zoho CRM integration is working properly.