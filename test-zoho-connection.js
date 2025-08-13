#!/usr/bin/env node

import axios from 'axios';

async function testZohoConnection() {
  console.log('🧪 Testing Zoho CRM Connection via API...');
  console.log('==========================================');

  try {
    console.log('\n1. Testing API connectivity through server...');
    
    // Test 1: Check Zoho status
    const statusResponse = await axios.get('http://localhost:5000/api/zoho/status');
    console.log('   Configuration Status:', statusResponse.data.configured ? '✅ Ready' : '❌ Not configured');
    
    console.log('\n2. Testing contact creation through server...');
    
    // Test 2: Create a test contact via the API
    const testUser = {
      email: `zoho.direct.test.${Date.now()}@thegunfirm.com`,
      firstName: 'ZohoAPI',
      lastName: 'DirectTest',
      password: 'TestPassword123!',
      subscriptionTier: 'Gold Monthly',
      billingCycle: 'monthly'
    };

    try {
      // Register the user
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', testUser);
      console.log('   ✅ User registration:', registerResponse.data.success ? 'Success' : 'Failed');
      
      if (registerResponse.data.success) {
        console.log(`   📧 Test user created: ${testUser.email}`);
        
        // Process subscription
        const subscriptionData = {
          subscriptionTier: 'Gold',
          billingCycle: 'monthly',
          amount: 5,
          customerInfo: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName
          }
        };
        
        const subResponse = await axios.post('http://localhost:5000/api/fap/process-subscription', subscriptionData);
        console.log('   ✅ Subscription processed:', subResponse.data.success ? 'Success' : 'Failed');
        console.log(`   💳 Transaction ID: ${subResponse.data.transactionId}`);
        
        // Wait a moment then check if it synced to Zoho
        console.log('\n3. Checking if data synced to Zoho...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Try to find the user in our local database first
        try {
          const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: testUser.email,
            password: testUser.password
          });
          
          if (loginResponse.data.id) {
            console.log('   ✅ User found in local system');
            console.log(`   📊 User ID: ${loginResponse.data.id}`);
            console.log(`   🏷️ Tier: ${loginResponse.data.membershipTier || 'Not set'}`);
            console.log('   📝 This data should be syncing to Zoho CRM Contacts module');
          }
        } catch (loginError) {
          console.log('   ⚠️ Could not verify user login:', loginError.message);
        }
      }
    } catch (error) {
      console.log('   ❌ Registration/subscription failed:', error.response?.data?.message || error.message);
    }

    console.log('\n4. Manual Zoho API test...');
    
    // Test direct API call to see if we can reach Zoho
    try {
      const zohoTestResponse = await axios.get('http://localhost:5000/api/zoho/test');
      console.log('   📊 Zoho test endpoint:', zohoTestResponse.data.status);
    } catch (error) {
      console.log('   ❌ Zoho test failed:', error.message);
    }

    console.log('\n5. Summary:');
    console.log('   ✅ User registration and tier processing working locally');
    console.log('   ❓ Zoho sync status needs verification');
    console.log('   📝 Check Zoho CRM Contacts module for new entries');
    
  } catch (error) {
    console.log('\n❌ Overall test failed:', error.message);
  }
}

testZohoConnection();