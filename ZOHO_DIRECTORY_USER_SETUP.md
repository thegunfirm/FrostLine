# Zoho Directory User Setup Guide

## Recommended User Structure

To properly test and use the SAML 2.0 integration with role-based access control, you should create the following users in Zoho Directory:

### 1. Admin User
- **Email**: admin@thegunfirm.com
- **Department**: TGF.Admin
- **Role Mapping**: admin
- **CMS Access**: Full access to all CMS functions, user management, system settings

### 2. Manager User  
- **Email**: manager@thegunfirm.com
- **Department**: TGF.Manager
- **Role Mapping**: manager
- **CMS Access**: Dashboard stats, order management, user oversight, reporting

### 3. Support User (Current)
- **Email**: rip@thegunfirm.com (already exists)
- **Department**: TGF.Support
- **Role Mapping**: support
- **CMS Access**: Customer support, order notes, limited user activity logs

### 4. Billing User
- **Email**: billing@thegunfirm.com
- **Department**: TGF.Billing
- **Role Mapping**: billing
- **CMS Access**: Billing management, subscription oversight, payment processing

## How to Create Users in Zoho Directory

1. **Login to Zoho Directory**
   - Go to https://directory.zoho.com
   - Login with your admin account

2. **Add New User**
   - Navigate to Users → Add User
   - Fill in the email address
   - Set a temporary password (user will change on first login)
   - Assign to the appropriate Department (TGF.Admin, TGF.Manager, etc.)

3. **Department Assignment**
   - Make sure each user is assigned to the correct department
   - This determines their role mapping in the CMS system

## Role Mappings

The SAML integration maps Zoho Directory departments to CMS roles:

```
TGF.Admin    → admin
TGF.Manager  → manager  
TGF.Support  → support
TGF.Billing  → billing
```

## Testing Each Role

After creating the users, you can test each role by:

1. **Logout** from current session
2. **Login** via SAML with each user
3. **Verify** they see appropriate CMS sections
4. **Test** their permissions match their role level

## Security Notes

- Each user should have a unique, strong password
- Consider requiring 2FA for admin and manager accounts
- Regular audit of user access and roles
- Disable users when they leave the organization

## Current Status

✅ Support user (rip@thegunfirm.com) - WORKING
⏳ Admin user - TO BE CREATED
⏳ Manager user - TO BE CREATED  
⏳ Billing user - TO BE CREATED