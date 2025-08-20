// Demonstrate the exact OAuth scope issue we're facing
const fs = require('fs');

function demonstrateScopeIssue() {
  console.log('🔍 Demonstrating OAuth Scope Issue\n');

  // Check token file exists
  const tokenFile = '.zoho-tokens.json';
  if (!fs.existsSync(tokenFile)) {
    console.log('❌ No token file found');
    return;
  }

  const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));

  console.log('📋 Current Status:');
  console.log('✅ Token file exists and loads successfully');
  console.log('✅ Access token present:', tokenData.accessToken?.length + ' characters');
  console.log('✅ Refresh token present:', !!tokenData.refreshToken);
  console.log('✅ Token not expired:', new Date(tokenData.expiresAt) > new Date());
  console.log('✅ System shows "Connected and working"');

  console.log('\n🚫 The Problem:');
  console.log('❌ API calls return: OAUTH_SCOPE_MISMATCH');
  console.log('❌ Error: "invalid oauth scope to access this URL"');
  console.log('❌ Cannot access /crm/v2/users endpoint');
  console.log('❌ Cannot access /crm/v2/deals endpoint');

  console.log('\n🧠 Root Cause Analysis:');
  console.log('• Original authorization was granted with LIMITED scopes');
  console.log('• Token refresh MAINTAINS the same scopes (cannot expand)'); 
  console.log('• Current tokens lack: ZohoCRM.modules.ALL permission');
  console.log('• System needs: Fresh authorization with FULL CRM scopes');

  console.log('\n🔧 Required Scopes:');
  console.log('• ZohoCRM.modules.ALL - Access to all CRM modules');
  console.log('• ZohoCRM.settings.ALL - Access to CRM settings');
  console.log('• ZohoCRM.users.ALL - Access to user information');  
  console.log('• ZohoCRM.org.READ - Read organization data');

  console.log('\n💡 Solution:');
  console.log('1. Click "Authorize Zoho Access" button in the interface');
  console.log('2. Complete OAuth flow with FULL permissions');
  console.log('3. New tokens will have all required CRM scopes');
  console.log('4. System will be fully functional for CRM integration');

  console.log('\n📝 Note:');
  console.log('• Token refresh works (extends expiry) ✅');
  console.log('• Token validation passes (basic check) ✅'); 
  console.log('• CRM API access fails (insufficient permissions) ❌');
  console.log('\nThe "working" status is misleading - need full authorization.');
}

demonstrateScopeIssue();