#!/usr/bin/env node

// Test the email parameter fix for Zoho API
async function testEmailParameterFix() {
  console.log('🔧 TESTING EMAIL PARAMETER FIX FOR ZOHO');
  console.log('=======================================\n');
  
  const testEmail = 'email.param.fix@thegunfirm.com';
  
  try {
    console.log('📝 URL Fix Applied:');
    console.log('❌ OLD: /search?criteria=Email:equals:email');
    console.log('✅ NEW: /search?email=email (dedicated email parameter)');
    console.log('📚 Based on Zoho API docs: More reliable for email-based searches\n');
    
    // Register user
    console.log('1️⃣ Registering user...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'EmailParam',
        lastName: 'Fix',
        subscriptionTier: 'Bronze'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📋 Registration:', registerData.success ? 'SUCCESS' : 'FAILED');
    
    if (!registerData.success) {
      console.log('❌ Registration failed');
      return;
    }
    
    console.log('\n2️⃣ Check server logs for verification token...');
    console.log('3️⃣ When verified, look for these success indicators:');
    console.log('   - "✅ Updated Zoho Contact email verification"');
    console.log('   - No "INVALID_URL_PATTERN" errors');
    console.log('   - Contact found using email parameter');
    
    console.log('\n✅ Test setup complete - verify email to test the fix');
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

testEmailParameterFix().catch(console.error);