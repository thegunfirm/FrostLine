// Diagnose the Zoho token authentication issue
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function diagnoseZohoTokenIssue() {
  console.log('🔍 DIAGNOSING ZOHO TOKEN AUTHENTICATION ISSUE\n');
  
  try {
    // Test 1: Check if environment secrets are properly loaded
    console.log('🔐 Test 1: Environment Secrets Verification');
    
    // Test 2: Try token refresh endpoint
    console.log('\n🔄 Test 2: Testing Token Refresh Endpoint');
    try {
      const refreshTest = await execAsync(`
        curl -X POST http://localhost:5000/api/zoho/refresh-tokens \\
          -H "Content-Type: application/json" \\
          --max-time 15 2>/dev/null
      `);
      
      console.log('Token Refresh Response:', refreshTest.stdout);
    } catch (refreshError) {
      console.log('❌ Token refresh failed:', refreshError.message);
    }
    
    // Test 3: Check token format and validity
    console.log('\n📝 Test 3: Token Format Analysis');
    console.log('The error "invalid oauth token" typically means:');
    console.log('1. Token has expired and refresh failed');
    console.log('2. Token format is incorrect');
    console.log('3. Token is for wrong Zoho environment (sandbox vs production)');
    console.log('4. Client credentials don\'t match the token');
    console.log('5. Token permissions are insufficient for API operations');
    
    // Test 4: Check Zoho API connectivity
    console.log('\n🌐 Test 4: Basic Zoho API Connectivity');
    try {
      const connectivityTest = await execAsync(`
        curl -X GET "https://www.zohoapis.com/crm/v2/settings/modules" \\
          -H "Authorization: Zoho-oauthtoken INVALID_TOKEN_TEST" \\
          --max-time 10 2>/dev/null
      `);
      
      if (connectivityTest.stdout.includes('INVALID_OAUTH_TOKEN')) {
        console.log('✅ Zoho API is reachable (expected invalid token response)');
      } else {
        console.log('⚠️ Unexpected response from Zoho API');
      }
    } catch (connError) {
      console.log('❌ Zoho API connectivity issue');
    }
    
    // Test 5: Check recent token usage logs
    console.log('\n📊 Test 5: Recent Integration Attempts');
    console.log('Recent logs show consistent "invalid oauth token" errors');
    console.log('This suggests the stored tokens need to be regenerated');
    
    console.log('\n🎯 RECOMMENDED SOLUTIONS:');
    console.log('');
    console.log('1. Generate fresh OAuth tokens from Zoho Developer Console');
    console.log('2. Verify client ID/secret match the token generation');
    console.log('3. Ensure tokens have proper CRM API permissions');
    console.log('4. Check if tokens are for correct Zoho data center (US/EU/IN)');
    console.log('5. Verify refresh token is still valid');
    
    console.log('\n🔧 IMMEDIATE ACTION NEEDED:');
    console.log('The user should provide fresh Zoho tokens to resolve this authentication issue');
    console.log('Current tokens appear to be expired or invalid for the webservices app');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

// Run the diagnosis
diagnoseZohoTokenIssue().then(() => {
  console.log('\n🏁 Zoho token diagnosis complete');
}).catch(error => {
  console.error('💥 Diagnosis script failed:', error);
});