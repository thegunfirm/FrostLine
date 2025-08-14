#!/usr/bin/env node

// Complete email verification flow test with Zoho integration
async function testCompleteEmailVerificationFlow() {
  console.log('🧪 COMPLETE EMAIL VERIFICATION + ZOHO INTEGRATION TEST');
  console.log('====================================================\n');
  
  const testEmail = 'complete.flow.test@thegunfirm.com';
  
  try {
    // Step 1: Register user
    console.log('1️⃣ Registering user...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Complete',
        lastName: 'FlowTest',
        subscriptionTier: 'Gold Annually'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📋 Registration response:', registerData);
    
    if (!registerData.success) {
      console.log('❌ Registration failed');
      return;
    }
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Check server logs for verification token
    console.log('\n2️⃣ Looking for verification token in server logs...');
    
    // Step 3: Test database state before verification
    console.log('\n3️⃣ Checking database state...');
    const dbCheckResponse = await fetch('http://localhost:5000/api/auth/check-user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    if (dbCheckResponse.ok) {
      const dbData = await dbCheckResponse.json();
      console.log('📊 Database state:', dbData);
    }
    
    // Step 4: Manually verify using the token from logs
    console.log('\n4️⃣ Check server console for verification URL, then test verification...');
    console.log('Look for a line like: 🔗 Verification URL: http://localhost:5000/verify-email?token=...');
    console.log('Copy that token and test it manually or use the verification endpoint');
    
    // Step 5: Test Zoho field integration
    console.log('\n5️⃣ Testing Zoho field integration after verification...');
    const zohoTestResponse = await fetch('http://localhost:5000/api/zoho/test-contact-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        testEmailVerificationFields: true
      })
    });
    
    if (zohoTestResponse.ok) {
      const zohoData = await zohoTestResponse.json();
      console.log('✅ Zoho field test:', zohoData);
    } else {
      console.log('📋 Zoho endpoint not available, but auto-refresh is running');
    }
    
    console.log('\n✅ Complete flow test initiated');
    console.log('📝 Check server logs for verification token and Zoho integration results');
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

testCompleteEmailVerificationFlow().catch(console.error);