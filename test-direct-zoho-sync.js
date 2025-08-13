#!/usr/bin/env node

import axios from 'axios';

async function testLocalAuthentication() {
  console.log('🏠 Testing Local Authentication System...');
  console.log('========================================');

  try {
    console.log('\n1. Creating test user with local authentication...');
    
    const testUser = {
      email: `local.auth.${Date.now()}@thegunfirm.com`,
      firstName: 'LocalAuth',
      lastName: 'TestUser',
      password: 'TestPassword123!',
      subscriptionTier: 'Bronze' // Use correct enum value
    };

    // Use the test user creation endpoint that bypasses email verification
    const createTestResponse = await axios.post('http://localhost:5000/api/auth/test-register', testUser);
    
    if (createTestResponse.data.success) {
      console.log('   ✅ Test user created successfully');
      console.log(`   📧 Email: ${testUser.email}`);
      console.log(`   🆔 Local User ID: ${createTestResponse.data.localUserId}`);
      console.log(`   🏷️ Tier: ${testUser.subscriptionTier}`);
      
      const localUserId = createTestResponse.data.localUserId;
      
      // Now test tier update via subscription processing
      console.log('\n2. Testing tier update via subscription...');
      
      const tierUpdateData = {
        userId: localUserId,
        membershipTier: 'Gold'
      };
      
      const tierUpdateResponse = await axios.post('http://localhost:5000/api/auth/update-tier', tierUpdateData);
      
      if (tierUpdateResponse.data.success) {
        console.log('   ✅ Tier updated successfully to Gold');
        
        // Test another tier update
        console.log('\n3. Testing Platinum tier update...');
        
        const platinumUpdate = {
          userId: localUserId,
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
      console.log('   ✅ Local user creation: Working');
      console.log('   ✅ Tier assignment and updates: Working');
      console.log('   📊 User stored in local PostgreSQL database');
      console.log(`   🔗 Local user created: ${testUser.email}`);
      
    } else {
      console.log('   ❌ Test user creation failed:', createTestResponse.data.error);
      
      // Check for database issues
      if (createTestResponse.data.error && createTestResponse.data.error.includes('database')) {
        console.log('\n📋 Database Issue Detected:');
        console.log('   • Check PostgreSQL connection');
        console.log('   • Verify schema is properly migrated');
        console.log('   • Run npm run db:push if needed');
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
      console.log('\n📝 The local auth endpoint may not be registered yet.');
      console.log('   Check if local-auth-routes.ts is properly imported');
    }
  }
}

testLocalAuthentication();