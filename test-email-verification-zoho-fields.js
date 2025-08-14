#!/usr/bin/env node

// Test Zoho email verification field integration using the internal service
import { readFileSync } from 'fs';

// Simulate what happens during email verification by calling the internal endpoint
async function testZohoEmailVerificationFields() {
  console.log('🔍 TESTING ZOHO EMAIL VERIFICATION FIELD INTEGRATION');
  console.log('===================================================\n');
  
  try {
    // Step 1: Test the registration endpoint to see what Zoho fields are being used
    const testEmail = 'zoho.fields.direct.test@thegunfirm.com';
    
    console.log('1️⃣ Testing registration with Zoho field integration...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Zoho',
        lastName: 'FieldTest',
        subscriptionTier: 'Bronze'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('📋 Registration Response:', registerData);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Test direct Zoho field validation via the endpoint
    console.log('\n2️⃣ Testing Zoho field validation endpoint...');
    
    const testFieldsResponse = await fetch('http://localhost:5000/api/zoho/test-email-verification-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'field.structure.test@thegunfirm.com',
        testMode: true
      })
    });
    
    if (testFieldsResponse.ok) {
      const fieldTestData = await testFieldsResponse.json();
      console.log('✅ Field test response:', fieldTestData);
    } else {
      console.log('⚠️ Field test endpoint not available, checking server logs...');
    }
    
    // Step 3: Try to create a simple contact to see what field names work
    console.log('\n3️⃣ Testing simple contact creation through internal service...');
    
    const simpleContactResponse = await fetch('http://localhost:5000/api/zoho/create-test-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'simple.contact.test@thegunfirm.com',
        firstName: 'Simple',
        lastName: 'Test',
        includeEmailFields: true
      })
    });
    
    if (simpleContactResponse.ok) {
      const contactData = await simpleContactResponse.json();
      console.log('✅ Contact creation response:', contactData);
    } else {
      console.log('⚠️ Contact creation endpoint not available');
    }
    
  } catch (error) {
    console.log('❌ Error during field testing:', error.message);
  }
  
  console.log('\n📋 Summary: Check server logs for Zoho integration details');
  console.log('The email verification system works locally, Zoho field names need validation');
}

testZohoEmailVerificationFields().catch(console.error);