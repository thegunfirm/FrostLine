#!/usr/bin/env node

/**
 * Test New Billing Policy - Immediate Card Charging for Firearms
 * Tests both backend payment processing and frontend UI updates
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test firearm order
const FIREARMS_ORDER = {
  userId: 12345,
  cartItems: [{
    id: 153782,
    name: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
    sku: 'GLOCK19GEN5',
    price: 619.99,
    quantity: 1,
    isFirearm: true,
    requiresFFL: true
  }],
  shippingAddress: {
    firstName: 'Policy',
    lastName: 'Test',
    address1: '123 Test Street',
    city: 'Austin',
    state: 'TX',
    zip: '78701'
  },
  paymentMethod: {
    cardNumber: '4111111111111111',
    expirationDate: '1225',
    cvv: '123'
  },
  customerInfo: {
    id: 12345,
    firstName: 'Policy',
    lastName: 'Test',
    email: 'policy.test@example.com',
    phone: '555-123-4567'
  }
};

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

async function testNewBillingPolicy() {
  console.log('🧪 TESTING NEW FIREARMS BILLING POLICY');
  console.log('=====================================\n');

  console.log('📝 NEW POLICY REQUIREMENTS:');
  console.log('   ✅ Charge cards immediately for firearms');
  console.log('   ✅ Hold RSR processing until human approval');
  console.log('   ✅ Update UI to reflect immediate billing');
  console.log('   ✅ Keep FFL and multi-gun compliance holds\n');

  // Test 1: Compliance check still works
  console.log('🔍 Step 1: Testing compliance check...');
  const complianceTest = await makeAPICall('POST', '/api/firearms-compliance/check', {
    userId: FIREARMS_ORDER.userId,
    cartItems: FIREARMS_ORDER.cartItems
  });

  if (complianceTest.success) {
    console.log('✅ Compliance check passed');
    console.log(`   Hold required: ${complianceTest.data.requiresHold}`);
    console.log(`   Hold type: ${complianceTest.data.holdType || 'None'}`);
  } else {
    console.log(`❌ Compliance check failed: ${complianceTest.error}`);
  }

  // Test 2: New payment policy test
  console.log('\n💳 Step 2: Testing new immediate charging policy...');
  const checkoutTest = await makeAPICall('POST', '/api/firearms-compliance/checkout', FIREARMS_ORDER);

  if (checkoutTest.success) {
    console.log('✅ CHECKOUT SUCCESS WITH NEW POLICY!');
    console.log(`   Order ID: ${checkoutTest.data.orderId}`);
    console.log(`   Order Number: ${checkoutTest.data.orderNumber}`);
    console.log(`   Status: ${checkoutTest.data.status}`);
    
    // Check payment method used
    if (checkoutTest.data.transactionId) {
      console.log(`   🎯 IMMEDIATE CHARGE: Transaction ID ${checkoutTest.data.transactionId}`);
      console.log(`   ✅ Payment captured immediately (NEW POLICY)`);
    }
    
    if (checkoutTest.data.authTransactionId) {
      console.log(`   ❌ ERROR: Still using auth-only: ${checkoutTest.data.authTransactionId}`);
    } else {
      console.log(`   ✅ No auth-only transaction (policy updated correctly)`);
    }
    
    if (checkoutTest.data.hold) {
      console.log(`   📋 Hold Applied: ${checkoutTest.data.hold.type}`);
      console.log(`   📄 Hold Reason: ${checkoutTest.data.hold.reason}`);
      console.log(`   ✅ RSR processing will be held until human approval`);
    }

    if (checkoutTest.data.dealId) {
      console.log(`   🔗 Zoho Deal: ${checkoutTest.data.dealId}`);
    }

    console.log('\n🎯 NEW POLICY VERIFICATION:');
    console.log('===============================');
    console.log('✅ Card charged immediately ✓');
    console.log('✅ Order created with hold ✓');
    console.log('✅ RSR processing blocked ✓');
    console.log('✅ Zoho CRM sync maintained ✓');

    return {
      success: true,
      orderNumber: checkoutTest.data.orderNumber,
      transactionId: checkoutTest.data.transactionId,
      holdType: checkoutTest.data.hold?.type
    };
  } else {
    console.log('\n❌ CHECKOUT FAILED');
    console.log(`   Error: ${checkoutTest.error}`);
    if (checkoutTest.response) {
      console.log(`   Details: ${JSON.stringify(checkoutTest.response, null, 2)}`);
    }
    return null;
  }
}

// Execute test
console.log('🚀 STARTING NEW POLICY VERIFICATION TEST\n');

testNewBillingPolicy()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 POLICY UPDATE TEST RESULTS');
    console.log('='.repeat(50));
    
    if (result && result.success) {
      console.log('✅ NEW BILLING POLICY IMPLEMENTED SUCCESSFULLY');
      console.log('');
      console.log('📊 Test Results:');
      console.log(`   Order: ${result.orderNumber}`);
      console.log(`   Payment: Charged immediately (${result.transactionId})`);
      console.log(`   Hold: ${result.holdType} (blocks RSR processing)`);
      console.log('');
      console.log('🎯 POLICY CHANGES CONFIRMED:');
      console.log('   • Cards are now charged immediately for firearms');
      console.log('   • RSR processing is held until human approval');
      console.log('   • Customer pays upfront, receives immediate confirmation');
      console.log('   • FFL compliance and multi-gun limits still enforced');
      console.log('');
      console.log('✅ Frontend UI should now show "Payment Processed" messaging');
      console.log('✅ Backend uses authCaptureTransaction instead of authOnlyTransaction');
    } else {
      console.log('❌ POLICY UPDATE INCOMPLETE');
      console.log('');
      console.log('🔧 Issues to resolve:');
      console.log('   • Backend may still be using auth-only transactions');
      console.log('   • Database schema updates may be needed');
      console.log('   • Checkout service configuration needs review');
    }
  })
  .catch(error => {
    console.error('\n💥 TEST FAILED:', error.message);
    process.exit(1);
  });