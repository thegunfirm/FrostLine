# Zoho Directory SAML 2.0 Integration Guide

## Complete Configuration for TheGunFirm CMS Staff Authentication

### 1. Zoho Directory Configuration

**Check the details of your TGF CMS SAML account:**
- **Sign-in URL:** `https://app.thegunfirm.com/sso/saml/login`
- **Sign-out URL:** `https://app.thegunfirm.com/sso/saml/logout`
- **Issuer:** `urn:thegunfirm:cms`
- **Relay State:** (leave blank)
- **Assertion Consumer Service URL:** `https://app.thegunfirm.com/sso/saml/acs`

**Credentials Details:**
- **Name ID format:** `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
- **Application Username:** `Email`

**Attribute Mapping:**
| Attribute Name | Format | Attribute Value |
|----------------|--------|-----------------|
| `email` | Basic | `Primary Email Address` |
| `firstName` | Basic | `First Name` |
| `lastName` | Basic | `Last Name` |
| `groups` | Basic | `Department` |

### 2. Department/Group Setup in Zoho Directory

Create these departments in Zoho Directory for role mapping:

- **TGF.Admin** - Full administrative access to CMS
- **TGF.Tech** - Technical administrative access 
- **TGF.Support** - Customer support staff access
- **TGF.Billing** - Billing and payment management access
- **TGF.Manager** - Management oversight access

### 3. Role Mapping

The system automatically maps departments to CMS roles:

| Zoho Department | CMS Role | Access Level |
|-----------------|----------|--------------|
| TGF.Admin | admin | Full system access |
| TGF.Tech | admin | Full technical access |
| TGF.Support | support | Customer support tools |
| TGF.Billing | billing | Billing and subscription management |
| TGF.Manager | manager | Management reporting and oversight |

### 4. Required Environment Variables

After configuring Zoho Directory, you'll need to add these to your environment:

```bash
# Get these from Zoho Directory SAML app settings
SAML_IDP_SSO_URL=https://accounts.zoho.com/samlauthrequest/[YOUR-ORG-ID]
SAML_IDP_CERT_PEM="-----BEGIN CERTIFICATE-----
[YOUR-ZOHO-CERTIFICATE-HERE]
-----END CERTIFICATE-----"

# Optional but recommended
SAML_REQUIRE_SIGNED_ASSERTIONS=true
SAML_CLOCK_SKEW_SEC=300
```

### 5. Testing the Integration

1. **Check Configuration Status:**
   ```bash
   curl http://localhost:5000/sso/saml/status
   ```

2. **Test Authentication Flow:**
   - Visit: `https://app.thegunfirm.com/staff-login`
   - Click "Sign in with Zoho Directory"
   - Complete authentication in Zoho
   - Verify successful redirect and role assignment

3. **Verify Service Provider Metadata:**
   ```bash
   curl http://localhost:5000/sso/saml/metadata
   ```

### 6. Security Considerations

- **HTTPS Required:** All SAML endpoints must use HTTPS in production
- **Signed Assertions:** Configure Zoho to sign SAML assertions
- **Certificate Validation:** Use the exact certificate from Zoho Directory
- **Session Security:** Sessions expire after 24 hours
- **Multi-Factor Authentication:** Enable MFA in Zoho Directory for all staff

### 7. Troubleshooting

**Common Issues:**
- **Invalid NameID Format:** Ensure email format is configured correctly
- **Missing Attributes:** Verify all required attributes are mapped
- **Certificate Errors:** Check certificate format and newlines
- **Clock Skew:** Adjust `SAML_CLOCK_SKEW_SEC` if timing issues occur

**Debug Tools:**
```bash
# Run SAML test script
npx tsx server/saml-test.ts

# Check server logs for SAML events
# Look for "🔐 SAML" prefixed messages
```

### 8. Next Steps After Configuration

Once SAML is configured and working:

1. **Assign Staff to Departments:** Add staff users to appropriate TGF departments
2. **Test Role Access:** Verify each role can access appropriate CMS sections
3. **Configure Session Settings:** Adjust session timeout if needed
4. **Setup Monitoring:** Monitor SAML authentication logs
5. **Document Access:** Create staff access documentation

### 9. Support

For issues with this integration:
- Check server logs for SAML-specific error messages
- Verify Zoho Directory configuration matches exactly
- Test with a single user first before rolling out to all staff
- Ensure network connectivity between systems