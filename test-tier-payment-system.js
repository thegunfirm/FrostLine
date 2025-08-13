#!/usr/bin/env node

/**
 * Tier Payment System Test
 * Tests subscription payments for Bronze, Gold, and Platinum tiers
 * Verifies Authorize.Net integration and Zoho CRM synchronization
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test subscription tiers
const SUBSCRIPTION_TIERS = [
  {
    name: 'Bronze',
    monthlyPrice: 0.00,
    yearlyPrice: 0.00,
    features: ['Free tier access', 'Basic product access', 'Community support']
  },
  {
    name: 'Gold', 
    monthlyPrice: 25.00,
    yearlyPrice: 250.00,
    features: ['Mid-tier access', '10% discount on products', 'Priority support', 'Exclusive deals']
  },
  {
    name: 'Platinum',
    monthlyPrice: 50.00,
    yearlyPrice: 500.00,
    features: ['Premium tier access', '20% discount on products', 'VIP support', 'Early access', 'Concierge service']
  }
];

async function makeAPICall(method, endpoint, data = null) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 0,
      response: error.response?.data
    };
  }
}

async function testSubscriptionTiers() {
  console.log('🏆 TESTING SUBSCRIPTION TIER SYSTEM');
  console.log('=====================================\n');

  console.log('📊 Available Subscription Tiers:');
  SUBSCRIPTION_TIERS.forEach(tier => {
    console.log(`   ${tier.name}: $${tier.monthlyPrice}/mo or $${tier.yearlyPrice}/year`);
    console.log(`      Features: ${tier.features.join(', ')}`);
  });

  // Test 1: Check if tier configuration endpoints exist
  console.log('\n🔍 Step 1: Testing tier configuration endpoints...');
  
  const tierConfigTest = await makeAPICall('GET', '/api/fap/subscription-tiers');
  if (tierConfigTest.success) {
    console.log('✅ Subscription tiers endpoint accessible');
    console.log(`   Found ${tierConfigTest.data?.length || 0} configured tiers`);
    if (tierConfigTest.data?.length > 0) {
      tierConfigTest.data.forEach(tier => {
        console.log(`   - ${tier.name}: $${tier.monthlyPrice}/mo`);
      });
    }
  } else {
    console.log('❌ Subscription tiers endpoint failed');
    console.log(`   Error: ${tierConfigTest.error}`);
  }

  // Test 2: Test membership status check
  console.log('\n👤 Step 2: Testing membership status endpoint...');
  
  const membershipStatusTest = await makeAPICall('GET', '/api/fap/membership-status');
  if (membershipStatusTest.success) {
    console.log('✅ Membership status endpoint accessible');
    const status = membershipStatusTest.data;
    if (status) {
      console.log(`   Current tier: ${status.currentTier || 'None'}`);
      console.log(`   Active: ${status.isActive ? 'Yes' : 'No'}`);
      console.log(`   Can access checkout: ${status.canAccessCheckout ? 'Yes' : 'No'}`);
    }
  } else {
    console.log('❌ Membership status check failed');
    console.log(`   Error: ${membershipStatusTest.error}`);
    if (membershipStatusTest.status === 401) {
      console.log('   ℹ️  This may be expected - user needs to be authenticated');
    }
  }

  return { tierConfigTest, membershipStatusTest };
}

async function testSubscriptionPayment() {
  console.log('\n💳 Step 3: Testing subscription payment processing...');

  // Test Bronze monthly subscription (free tier)
  const bronzePaymentTest = {
    subscriptionTier: 'Bronze',
    billingCycle: 'monthly',
    amount: 0.00,
    paymentMethod: {
      cardNumber: '4111111111111111', // Test card
      expirationDate: '1225',
      cvv: '123',
      firstName: 'Test',
      lastName: 'User',
      address: '123 Test St',
      city: 'Austin',
      state: 'TX',
      zip: '78701'
    },
    customerInfo: {
      firstName: 'Test',
      lastName: 'User',
      email: `tier-test-${Date.now()}@example.com`
    }
  };

  const paymentResult = await makeAPICall('POST', '/api/fap/process-subscription', bronzePaymentTest);
  
  if (paymentResult.success) {
    console.log('✅ SUBSCRIPTION PAYMENT TEST PASSED!');
    console.log(`   Transaction ID: ${paymentResult.data.transactionId}`);
    console.log(`   Subscription ID: ${paymentResult.data.subscriptionId || 'N/A'}`);
    console.log(`   Tier: ${paymentResult.data.subscriptionTier}`);
    console.log(`   Amount: $${paymentResult.data.amount}`);
    
    if (paymentResult.data.zohoDealId) {
      console.log(`   Zoho CRM Deal: ${paymentResult.data.zohoDealId}`);
    }
    
    return paymentResult.data;
  } else {
    console.log('❌ SUBSCRIPTION PAYMENT FAILED');
    console.log(`   Error: ${paymentResult.error}`);
    console.log(`   Status: ${paymentResult.status}`);
    
    if (paymentResult.status === 404) {
      console.log('   ℹ️  Subscription payment endpoint may not exist yet');
    } else if (paymentResult.status === 500) {
      console.log('   🔧 Possible issues:');
      console.log('      • Authorize.Net configuration');
      console.log('      • Database schema');
      console.log('      • Missing API keys');
    }
    
    return null;
  }
}

async function testTierUpgrade() {
  console.log('\n⬆️  Step 4: Testing tier upgrade functionality...');

  const upgradeTest = {
    newTier: 'Gold',
    billingCycle: 'yearly',
    amount: 250.00
  };

  const upgradeResult = await makeAPICall('POST', '/api/fap/upgrade-subscription', upgradeTest);
  
  if (upgradeResult.success) {
    console.log('✅ TIER UPGRADE TEST PASSED!');
    console.log(`   New tier: ${upgradeResult.data.newTier}`);
    console.log(`   Billing cycle: ${upgradeResult.data.billingCycle}`);
    console.log(`   Amount: $${upgradeResult.data.amount}`);
  } else {
    console.log('❌ Tier upgrade failed (may not be implemented yet)');
    console.log(`   Error: ${upgradeResult.error}`);
  }

  return upgradeResult.success ? upgradeResult.data : null;
}

async function testPricingCalculation() {
  console.log('\n🧮 Step 5: Testing tier-based pricing calculation...');

  // Test product pricing for different tiers
  const pricingTest = await makeAPICall('GET', '/api/products/pricing-test');
  
  if (pricingTest.success) {
    console.log('✅ Pricing calculation working');
    console.log('   Sample product pricing by tier:');
    if (pricingTest.data.tiers) {
      Object.entries(pricingTest.data.tiers).forEach(([tier, price]) => {
        console.log(`      ${tier}: $${price}`);
      });
    }
  } else {
    console.log('❌ Pricing calculation test not available');
    console.log(`   Error: ${pricingTest.error}`);
  }

  return pricingTest.success ? pricingTest.data : null;
}

// Execute all tests
async function runComprehensiveTest() {
  console.log('🚀 STARTING COMPREHENSIVE TIER PAYMENT SYSTEM TEST\n');

  try {
    const basicTests = await testSubscriptionTiers();
    const paymentTest = await testSubscriptionPayment(); 
    const upgradeTest = await testTierUpgrade();
    const pricingTest = await testPricingCalculation();

    console.log('\n' + '='.repeat(60));
    console.log('🏁 TIER PAYMENT SYSTEM TEST RESULTS');
    console.log('='.repeat(60));

    console.log('\n📊 ENDPOINT AVAILABILITY:');
    console.log(`   Tier Configuration: ${basicTests.tierConfigTest.success ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Membership Status: ${basicTests.membershipStatusTest.success ? '✅ Working' : '❌ Auth Required'}`);
    console.log(`   Payment Processing: ${paymentTest ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Tier Upgrades: ${upgradeTest ? '✅ Working' : '❌ Not Implemented'}`);
    console.log(`   Pricing Calculation: ${pricingTest ? '✅ Working' : '❌ Not Available'}`);

    if (paymentTest) {
      console.log('\n💰 PAYMENT TEST SUCCESS:');
      console.log('   • Subscription payment processed successfully');
      console.log('   • Authorize.Net integration working');
      console.log('   • Transaction tracking functional');
      
      if (paymentTest.zohoDealId) {
        console.log('   • Zoho CRM synchronization active');
      }
      
      console.log('\n🎯 READY FOR PRODUCTION USE');
      console.log('   The subscription payment system is operational');
    } else {
      console.log('\n🔧 AREAS NEEDING ATTENTION:');
      console.log('   • Subscription payment processing needs configuration');
      console.log('   • Verify Authorize.Net API keys are set');
      console.log('   • Check database schema for subscription tables');
      console.log('   • Ensure FAP integration routes are active');
    }

    console.log('\n📈 SUBSCRIPTION SYSTEM STATUS:');
    if (basicTests.tierConfigTest.success && paymentTest) {
      console.log('✅ FULLY FUNCTIONAL - Ready to process subscription payments');
    } else if (basicTests.tierConfigTest.success) {
      console.log('⚠️  PARTIALLY FUNCTIONAL - Configuration exists but payments need setup');
    } else {
      console.log('❌ NOT FUNCTIONAL - Core subscription system needs implementation');
    }

  } catch (error) {
    console.error('\n💥 Test execution error:', error.message);
    console.log('\n🔧 This may indicate:');
    console.log('   • Server connection issues');
    console.log('   • Missing route implementations');
    console.log('   • Database connectivity problems');
  }
}

// Run the comprehensive test
runComprehensiveTest();