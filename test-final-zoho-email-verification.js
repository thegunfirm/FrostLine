#!/usr/bin/env node

// Final test of email verification with Zoho after URL fix
async function testFinalZohoEmailVerification() {
  console.log('🔧 FINAL TEST: Email Verification + Zoho (URL Fixed)');
  console.log('==================================================\n');
  
  const testEmail = 'final.url.fixed@thegunfirm.com';
  
  try {
    // Step 1: Register and get verification token
    console.log('1️⃣ Registering user...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Final',
        lastName: 'URLFixed',
        subscriptionTier: 'Bronze'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📋 Registration:', registerData.success ? 'SUCCESS' : 'FAILED');
    
    if (!registerData.success) {
      console.log('❌ Registration failed, stopping test');
      return;
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Check server logs for token and verify
    console.log('\n2️⃣ Check server console for verification token...');
    console.log('Look for: 🔗 Verification URL: http://localhost:5000/verify-email?token=...');
    
    // Step 3: Show what will happen when verified
    console.log('\n3️⃣ When you verify the email, the system will:');
    console.log('- Update local database with verification timestamp');
    console.log('- Attempt to find Zoho contact using FIXED URL (no parentheses)');
    console.log('- Update Zoho contact with "Email Verified" = true');
    console.log('- Update "Email Verification Time Stamp" with current time');
    
    console.log('\n4️⃣ Expected success indicators:');
    console.log('- Local DB: email_verified = true');
    console.log('- Zoho logs: "✅ Updated Zoho Contact email verification"');
    console.log('- No more "INVALID_URL_PATTERN" errors');
    
    console.log('\n📝 URL Fix Applied:');
    console.log('❌ OLD: /search?criteria=(Email:equals:email)');
    console.log('✅ NEW: /search?criteria=Email:equals:email');
    
    console.log('\n✅ Test setup complete - check server logs and verify email to see results');
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

testFinalZohoEmailVerification().catch(console.error);