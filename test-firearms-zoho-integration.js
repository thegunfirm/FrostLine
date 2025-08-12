#!/usr/bin/env node

/**
 * Test Script: Firearms Compliance Zoho Integration
 * Verifies that firearms compliance orders are properly synchronized to Zoho CRM
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Test data using real firearm from RSR inventory
const REAL_GLOCK_19 = {
  id: 153782,
  name: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
  sku: 'GLOCK19GEN5',
  price: 619.99,
  quantity: 1,
  isFirearm: true,
  requiresFFL: true
};

const TEST_CUSTOMER = {
  id: 999999,
  firstName: 'ZohoTest',
  lastName: 'FirearmsCustomer', 
  email: 'zoho.firearms.test@example.com',
  phone: '555-987-6543'
};

const SHIPPING_ADDRESS = {
  firstName: 'ZohoTest',
  lastName: 'FirearmsCustomer',
  address1: '789 Test Firearms Street',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  country: 'US'
};

const PAYMENT_INFO = {
  cardNumber: '4111111111111111',
  expirationDate: '1225',
  cvv: '123'
};

async function makeRequest(method, endpoint, data = null) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
}

async function testFirearmsZohoIntegration() {
  console.log('🔄 Testing Firearms Compliance → Zoho CRM Integration');
  console.log('=====================================================\n');

  // Test the configuration endpoint first
  console.log('⚙️  Testing Configuration API...');
  const configResult = await makeRequest('GET', '/api/firearms-compliance/config');
  if (configResult.success) {
    console.log('✅ Configuration API working');
    console.log(`   Window: ${configResult.data.config.policyFirearmWindowDays} days`);
    console.log(`   Limit: ${configResult.data.config.policyFirearmLimit} firearms`);
  } else {
    console.log('❌ Configuration API failed:', configResult.error);
    return;
  }

  console.log('\n📦 Creating FFL Hold Order that should sync to Zoho...');
  console.log(`Using: ${REAL_GLOCK_19.name}`);
  console.log(`Customer: ${TEST_CUSTOMER.firstName} ${TEST_CUSTOMER.lastName}`);
  console.log(`Email: ${TEST_CUSTOMER.email}`);

  // Create a simulated order through the new API
  const orderPayload = {
    userId: TEST_CUSTOMER.id,
    cartItems: [REAL_GLOCK_19],
    shippingAddress: SHIPPING_ADDRESS,
    paymentMethod: PAYMENT_INFO,
    customerInfo: TEST_CUSTOMER
  };

  console.log('\n🔍 Step 1: Attempting firearms compliance checkout...');
  const checkoutResult = await makeRequest('POST', '/api/firearms-compliance/checkout', orderPayload);

  if (checkoutResult.success) {
    console.log('✅ Checkout successful!');
    console.log(`   Order ID: ${checkoutResult.data.orderId}`);
    console.log(`   Order Number: ${checkoutResult.data.orderNumber}`);
    console.log(`   Status: ${checkoutResult.data.status}`);
    console.log(`   Hold Type: ${checkoutResult.data.hold?.type || 'None'}`);
    console.log(`   Auth Transaction: ${checkoutResult.data.authTransactionId || 'N/A'}`);
    
    if (checkoutResult.data.dealId) {
      console.log(`   ✅ Zoho Deal Created: ${checkoutResult.data.dealId}`);
      console.log('\n🎉 ZOHO INTEGRATION SUCCESS!');
      console.log('This order should now be visible in your Zoho CRM as a Deal.');
      console.log(`Search for: "${checkoutResult.data.orderNumber}" or "${TEST_CUSTOMER.email}"`);
      
      return {
        orderId: checkoutResult.data.orderId,
        orderNumber: checkoutResult.data.orderNumber,
        dealId: checkoutResult.data.dealId,
        customerEmail: TEST_CUSTOMER.email
      };
    } else {
      console.log('   ⚠️  Order created but no Zoho Deal ID returned');
      console.log('   This suggests the Zoho integration may have failed');
    }
  } else {
    console.log('❌ Checkout failed:', checkoutResult.error);
    if (checkoutResult.status === 500) {
      console.log('   This is likely due to missing database tables or configuration');
    }
  }

  return null;
}

async function checkZohoAPIStatus() {
  console.log('\n🔍 Checking Zoho API connectivity...');
  
  // Test basic Zoho endpoints
  const zohoTests = [
    { name: 'Test Zoho Integration', endpoint: '/api/zoho/test' },
    { name: 'Get User Deals', endpoint: '/api/zoho/deals/bronze.test@example.com' }
  ];

  for (const test of zohoTests) {
    const result = await makeRequest('GET', test.endpoint);
    if (result.success) {
      console.log(`✅ ${test.name}: Working`);
    } else {
      console.log(`❌ ${test.name}: Failed - ${result.error}`);
    }
  }
}

// Run the test
console.log('🚀 Starting Firearms Compliance → Zoho Integration Test');
console.log('This test creates a real FFL hold order and verifies Zoho sync\n');

testFirearmsZohoIntegration()
  .then(async (result) => {
    if (result) {
      console.log('\n📋 INTEGRATION TEST RESULTS:');
      console.log('============================');
      console.log(`Order Number: ${result.orderNumber}`);
      console.log(`Customer Email: ${result.customerEmail}`);
      console.log(`Zoho Deal ID: ${result.dealId}`);
      console.log('\n🔍 Next Steps:');
      console.log('1. Login to your Zoho CRM');
      console.log('2. Search for Deals containing "GLOCK19GEN5"');
      console.log(`3. Look for customer "${result.customerEmail}"`);
      console.log('4. Verify the deal shows "Pending FFL" status');
      console.log('5. Confirm all order details are accurate');
    }
    
    await checkZohoAPIStatus();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 FIREARMS COMPLIANCE → ZOHO INTEGRATION TEST COMPLETE');
    if (result) {
      console.log('✅ Integration appears to be working correctly');
      console.log('📈 Check your Zoho CRM for the new deal');
    } else {
      console.log('❌ Integration test failed - check logs and configuration');
    }
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });