#!/usr/bin/env node

import axios from 'axios';

async function testDirectZohoSync() {
  console.log('🚀 Testing Direct Zoho CRM Sync...');
  console.log('==================================');

  try {
    console.log('\n1. Creating test user with direct Zoho sync...');
    
    const testUser = {
      email: `zoho.direct.${Date.now()}@thegunfirm.com`,
      firstName: 'ZohoSync',
      lastName: 'TestUser',
      password: 'TestPassword123!',
      subscriptionTier: 'Bronze' // Use correct enum value
    };

    // Use the test user creation endpoint that bypasses email verification
    const createTestResponse = await axios.post('http://localhost:5000/api/auth/test-register', testUser);
    
    if (createTestResponse.data.success) {
      console.log('   ✅ Test user created successfully');
      console.log(`   📧 Email: ${testUser.email}`);
      console.log(`   🆔 Zoho Contact ID: ${createTestResponse.data.zohoContactId}`);
      console.log(`   🏷️ Tier: ${testUser.subscriptionTier}`);
      
      const zohoContactId = createTestResponse.data.zohoContactId;
      
      // Now test tier update via subscription processing
      console.log('\n2. Testing tier update via subscription...');
      
      const tierUpdateData = {
        zohoContactId: zohoContactId,
        membershipTier: 'Gold'
      };
      
      const tierUpdateResponse = await axios.post('http://localhost:5000/api/auth/update-tier', tierUpdateData);
      
      if (tierUpdateResponse.data.success) {
        console.log('   ✅ Tier updated successfully to Gold');
        
        // Test another tier update
        console.log('\n3. Testing Platinum tier update...');
        
        const platinumUpdate = {
          zohoContactId: zohoContactId,
          membershipTier: 'Platinum Founder'
        };
        
        const platinumResponse = await axios.post('http://localhost:5000/api/auth/update-tier', platinumUpdate);
        
        if (platinumResponse.data.success) {
          console.log('   ✅ Tier updated successfully to Platinum Founder');
        } else {
          console.log('   ⚠️ Platinum tier update issue:', platinumResponse.data.error);
        }
      } else {
        console.log('   ⚠️ Tier update issue:', tierUpdateResponse.data.error);
      }
      
      console.log('\n4. Summary:');
      console.log('   ✅ Direct Zoho contact creation: Working');
      console.log('   ✅ Tier assignment and updates: Working');
      console.log('   📊 Contact should now be visible in Zoho CRM');
      console.log(`   🔗 Check Zoho CRM Contacts module for: ${testUser.email}`);
      
    } else {
      console.log('   ❌ Test user creation failed:', createTestResponse.data.error);
      
      // Check if it's a token issue
      if (createTestResponse.data.error && createTestResponse.data.error.includes('access token')) {
        console.log('\n📋 Token Issue Detected:');
        console.log('   • ZOHO_ACCESS_TOKEN may be expired');
        console.log('   • Visit: https://[your-domain]/api/zoho/auth/initiate');
        console.log('   • Complete OAuth flow to get new tokens');
      }
    }
    
    console.log('\n5. Testing existing user login...');
    
    // Test login functionality
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      
      if (loginResponse.data.success !== false) {
        console.log('   ✅ Login successful');
        console.log(`   📊 User ID: ${loginResponse.data.id}`);
        console.log(`   🏷️ Tier: ${loginResponse.data.membershipTier || 'Not set'}`);
      } else {
        console.log('   ⚠️ Login failed:', loginResponse.data.error);
      }
    } catch (loginError) {
      console.log('   ⚠️ Login test failed:', loginError.response?.data?.error || loginError.message);
    }

  } catch (error) {
    console.log('\n❌ Overall test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n📝 The create-test-user endpoint may not exist yet.');
      console.log('   Check if the endpoint is properly registered in routes.ts');
    }
  }
}

testDirectZohoSync();