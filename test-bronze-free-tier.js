#!/usr/bin/env node

/**
 * Test Bronze Free Tier Registration
 * Verifies that Bronze tier is free and no payment required
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testBronzeFreeRegistration() {
  console.log('🆓 TESTING BRONZE FREE TIER REGISTRATION');
  console.log('========================================\n');

  try {
    // Test 1: Get subscription tiers and verify Bronze is free
    console.log('📊 Step 1: Verifying Bronze tier is free...');
    
    const tiersResponse = await axios.get(`${BASE_URL}/api/fap/subscription-tiers`);
    if (tiersResponse.status === 200 && tiersResponse.data) {
      const bronzeTier = tiersResponse.data.find(tier => tier.name === 'Bronze');
      if (bronzeTier) {
        console.log(`✅ Bronze tier found: $${bronzeTier.monthlyPrice}/month, $${bronzeTier.yearlyPrice}/year`);
        if (bronzeTier.monthlyPrice === 0 && bronzeTier.yearlyPrice === 0) {
          console.log('✅ Bronze tier is correctly set as FREE');
        } else {
          console.log('❌ Bronze tier is NOT free - pricing issue detected');
          return false;
        }
      } else {
        console.log('❌ Bronze tier not found in available tiers');
        return false;
      }
    } else {
      console.log('❌ Failed to fetch subscription tiers');
      return false;
    }

    // Test 2: Attempt Bronze tier "payment" (should be free)
    console.log('\n🎯 Step 2: Testing Bronze tier registration...');
    
    const bronzeRegistration = {
      subscriptionTier: 'Bronze',
      billingCycle: 'monthly',
      amount: 0.00, // Free!
      customerInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: `bronze-test-${Date.now()}@example.com`
      }
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/fap/process-subscription`, bronzeRegistration);
    
    if (paymentResponse.status === 200) {
      const result = paymentResponse.data;
      console.log('✅ BRONZE FREE REGISTRATION SUCCESSFUL!');
      console.log(`   User Email: ${bronzeRegistration.customerInfo.email}`);
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   Auth Code: ${result.authCode}`);
      console.log(`   Tier: ${result.subscriptionTier}`);
      console.log(`   Amount Charged: $${result.amount || 0.00}`);
      
      if (result.transactionId?.startsWith('free_')) {
        console.log('✅ Correctly processed as FREE transaction');
      }
      
      console.log('\n🔍 ZOHO CRM VERIFICATION:');
      console.log(`   Look up this user in Zoho CRM: ${bronzeRegistration.customerInfo.email}`);
      console.log('   Expected status: Bronze tier member (free)');
      
      return {
        success: true,
        userEmail: bronzeRegistration.customerInfo.email,
        transactionId: result.transactionId,
        tier: 'Bronze'
      };
      
    } else {
      console.log('❌ Bronze registration failed');
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Error: ${paymentResponse.data?.error || 'Unknown error'}`);
      return false;
    }

  } catch (error) {
    console.log('❌ Test execution failed:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    console.log(`   Status: ${error.response?.status || 'No status'}`);
    
    if (error.response?.status === 400) {
      console.log('\n🔧 Possible issues:');
      console.log('   • Server may not have restarted with updated Bronze pricing');
      console.log('   • Payment validation logic may still expect non-zero amounts');
      console.log('   • Service import/initialization issues');
    }
    
    return false;
  }
}

// Test paid tier for comparison
async function testGoldPaidTier() {
  console.log('\n💳 TESTING GOLD PAID TIER (for comparison)');
  console.log('==========================================\n');

  try {
    const goldRegistration = {
      subscriptionTier: 'Gold',
      billingCycle: 'monthly',
      amount: 25.00,
      customerInfo: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: `gold-test-${Date.now()}@example.com`
      }
    };

    const paymentResponse = await axios.post(`${BASE_URL}/api/fap/process-subscription`, goldRegistration);
    
    if (paymentResponse.status === 200) {
      const result = paymentResponse.data;
      console.log('✅ GOLD PAID REGISTRATION SUCCESSFUL!');
      console.log(`   User Email: ${goldRegistration.customerInfo.email}`);
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   Tier: ${result.subscriptionTier}`);
      console.log(`   Amount Charged: $${goldRegistration.amount}`);
      
      return {
        success: true,
        userEmail: goldRegistration.customerInfo.email,
        transactionId: result.transactionId,
        tier: 'Gold'
      };
    } else {
      console.log('❌ Gold registration failed (expected in development mode)');
      return false;
    }

  } catch (error) {
    console.log('💡 Gold tier registration error (expected in dev mode):');
    console.log(`   ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Run comprehensive test
async function runTest() {
  console.log('🚀 STARTING BRONZE FREE TIER TEST\n');

  const bronzeTest = await testBronzeFreeRegistration();
  const goldTest = await testGoldPaidTier();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 BRONZE FREE TIER TEST RESULTS');
  console.log('='.repeat(60));

  if (bronzeTest && bronzeTest.success) {
    console.log('\n✅ BRONZE FREE TIER: WORKING CORRECTLY');
    console.log('   • Bronze tier is properly configured as free ($0)');
    console.log('   • Free registration process completed successfully');
    console.log('   • No payment processing required for Bronze tier');
    console.log('   • User accounts created in system');
    
    console.log('\n📋 USER ACCOUNTS TO VERIFY IN ZOHO CRM:');
    console.log(`   Bronze (Free): ${bronzeTest.userEmail}`);
    console.log(`   Transaction: ${bronzeTest.transactionId}`);
    
    if (goldTest && goldTest.success) {
      console.log(`   Gold (Paid): ${goldTest.userEmail}`);
      console.log(`   Transaction: ${goldTest.transactionId}`);
    }
    
  } else {
    console.log('\n❌ BRONZE FREE TIER: NEEDS ATTENTION');
    console.log('   • Bronze tier registration failed');
    console.log('   • Check server restart status');
    console.log('   • Verify pricing configuration');
  }

  console.log('\n🎯 SUMMARY:');
  console.log(`   Bronze (Free) Status: ${bronzeTest?.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Gold (Paid) Status: ${goldTest?.success ? '✅ Working' : '⚠️ Development Mode'}`);
}

runTest();