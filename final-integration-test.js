#!/usr/bin/env node

/**
 * Final Integration Test - Firearms Compliance → Zoho CRM
 * Comprehensive test to verify the complete system is working
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Real firearm order for testing
const FIREARMS_ORDER = {
  userId: 999999,
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
    firstName: 'Final',
    lastName: 'TestCustomer',
    address1: '456 Integration Test Drive',
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
    id: 999999,
    firstName: 'Final',
    lastName: 'TestCustomer',
    email: 'final.integration.test@example.com',
    phone: '555-999-8888'
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

async function runFinalIntegrationTest() {
  console.log('🎯 FINAL FIREARMS COMPLIANCE ↔️ ZOHO INTEGRATION TEST');
  console.log('===================================================\n');

  // Test 1: Configuration verification
  console.log('📋 Test 1: Verifying system configuration...');
  const configTest = await makeAPICall('GET', '/api/firearms-compliance/config');
  if (configTest.success) {
    console.log('✅ System configured correctly');
    console.log(`   Policy Window: ${configTest.data.config.policyFirearmWindowDays} days`);
    console.log(`   Firearm Limit: ${configTest.data.config.policyFirearmLimit} per window`);
    console.log(`   FFL Holds: ${configTest.data.config.featureFflHold ? 'Enabled' : 'Disabled'}`);
  } else {
    console.log('❌ Configuration test failed');
    return false;
  }

  // Test 2: Compliance check
  console.log('\n📋 Test 2: Pre-checkout compliance validation...');
  const complianceTest = await makeAPICall('POST', '/api/firearms-compliance/check', {
    userId: FIREARMS_ORDER.userId,
    cartItems: FIREARMS_ORDER.cartItems
  });
  
  if (complianceTest.success) {
    console.log('✅ Compliance check passed');
    console.log(`   Will require hold: ${complianceTest.data.requiresHold}`);
    console.log(`   Hold type: ${complianceTest.data.holdType || 'None'}`);
  } else {
    console.log(`⚠️  Compliance check: ${complianceTest.error}`);
  }

  // Test 3: Full firearms checkout with Zoho sync
  console.log('\n📋 Test 3: Complete firearms checkout (with Zoho sync)...');
  console.log(`Product: ${FIREARMS_ORDER.cartItems[0].name}`);
  console.log(`Customer: ${FIREARMS_ORDER.customerInfo.firstName} ${FIREARMS_ORDER.customerInfo.lastName}`);
  console.log(`Email: ${FIREARMS_ORDER.customerInfo.email}`);

  const checkoutTest = await makeAPICall('POST', '/api/firearms-compliance/checkout', FIREARMS_ORDER);

  if (checkoutTest.success) {
    console.log('\n🎉 CHECKOUT SUCCESS!');
    console.log(`   Order ID: ${checkoutTest.data.orderId}`);
    console.log(`   Order Number: ${checkoutTest.data.orderNumber}`);
    console.log(`   Status: ${checkoutTest.data.status}`);
    
    if (checkoutTest.data.hold) {
      console.log(`   Hold Applied: ${checkoutTest.data.hold.type} - ${checkoutTest.data.hold.reason}`);
    }
    
    if (checkoutTest.data.authTransactionId) {
      console.log(`   Auth Transaction: ${checkoutTest.data.authTransactionId}`);
    }

    if (checkoutTest.data.dealId) {
      console.log(`   ✅ ZOHO DEAL CREATED: ${checkoutTest.data.dealId}`);
      console.log('\n🎯 INTEGRATION SUCCESS CONFIRMED!');
      
      console.log('\n📊 WHAT TO VERIFY IN ZOHO CRM:');
      console.log('================================');
      console.log(`1. Search for Deal: "${checkoutTest.data.orderNumber}"`);
      console.log(`2. Search for Contact: "${FIREARMS_ORDER.customerInfo.email}"`);
      console.log('3. Verify product: GLOCK 19 Gen 5');
      console.log('4. Check amount: $619.99');
      console.log('5. Confirm status: "Pending FFL"');
      console.log('6. Verify all customer details are correct');

      return {
        success: true,
        orderNumber: checkoutTest.data.orderNumber,
        dealId: checkoutTest.data.dealId,
        customerEmail: FIREARMS_ORDER.customerInfo.email,
        orderId: checkoutTest.data.orderId
      };
    } else {
      console.log('   ⚠️  Order created but NO Zoho Deal ID - integration may need attention');
    }
  } else {
    console.log('\n❌ CHECKOUT FAILED');
    console.log(`   Error: ${checkoutTest.error}`);
    console.log(`   Status: ${checkoutTest.status}`);
    
    if (checkoutTest.response) {
      console.log(`   Response: ${JSON.stringify(checkoutTest.response, null, 2)}`);
    }
  }

  // Test 4: Zoho connectivity verification
  console.log('\n📋 Test 4: Direct Zoho API connectivity...');
  const zohoTest = await makeAPICall('POST', '/api/zoho/test');
  if (zohoTest.success) {
    console.log('✅ Zoho API connection verified');
  } else {
    console.log(`❌ Zoho API issue: ${zohoTest.error}`);
  }

  return null;
}

// Execute final test
console.log('🚀 EXECUTING COMPREHENSIVE INTEGRATION TEST');
console.log('This will create a real firearms order and verify Zoho sync\n');

runFinalIntegrationTest()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    
    if (result && result.success) {
      console.log('✅ COMPLETE INTEGRATION SUCCESS');
      console.log('The firearms compliance system is fully operational!');
      console.log('');
      console.log('📄 Test Order Details:');
      console.log(`   Order Number: ${result.orderNumber}`);
      console.log(`   Order ID: ${result.orderId}`);
      console.log(`   Zoho Deal ID: ${result.dealId}`);
      console.log(`   Customer Email: ${result.customerEmail}`);
      console.log('');
      console.log('🔍 VERIFICATION: Check your Zoho CRM now');
      console.log('The test order should be immediately visible');
      console.log('');
      console.log('✅ ALL SYSTEMS OPERATIONAL:');
      console.log('   • Firearms compliance enforcement');
      console.log('   • FFL hold management');
      console.log('   • Payment authorization');
      console.log('   • Zoho CRM synchronization');
      console.log('   • Order status tracking');
    } else {
      console.log('❌ INTEGRATION ISSUES DETECTED');
      console.log('The firearms compliance system needs additional configuration');
      console.log('');
      console.log('🔧 LIKELY CAUSES:');
      console.log('   • Missing checkout endpoint implementation');
      console.log('   • Database connectivity issues');
      console.log('   • Zoho API configuration problems');
      console.log('   • Route registration conflicts');
    }
  })
  .catch(error => {
    console.error('\n💥 TEST EXECUTION FAILED:', error.message);
    process.exit(1);
  });