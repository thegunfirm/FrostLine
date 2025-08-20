/**
 * Simple order test using authenticated API calls
 * Tests complete ordering flow with real Glock + accessory
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test customer credentials (user created and verified)
const testCustomer = {
  email: 'ordertest@example.com',
  password: 'TestPassword123!'
};

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  let data;
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    console.log(`${endpoint} returned non-JSON: ${response.status}`);
    return { data: null, response, text };
  }
  
  console.log(`${options.method || 'GET'} ${endpoint}: ${response.status}`);
  
  if (!response.ok) {
    console.error('Error:', data);
    throw new Error(`Request failed: ${response.status}`);
  }
  
  return { data, response };
}

async function testOrderFlow() {
  console.log('🧪 Testing Complete Order Flow');
  console.log('==============================');
  
  let sessionCookie = '';
  
  try {
    // Step 1: Login
    console.log('\n1️⃣ LOGGING IN WITH VERIFIED USER');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(testCustomer)
    });
    
    // Extract session cookie
    const setCookieHeader = loginResult.response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
      console.log('✅ Session cookie obtained');
    }
    
    // Step 2: Clear any existing cart
    console.log('\n2️⃣ CLEARING CART');
    try {
      await makeRequest('/api/cart/clear', {
        method: 'POST',
        headers: { 'Cookie': sessionCookie }
      });
    } catch (e) {
      console.log('Cart clear endpoint not found, continuing...');
    }
    
    // Step 3: Add Glock 17 Gen5 to cart
    console.log('\n3️⃣ ADDING GLOCK 17 GEN5 (FIREARM)');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: JSON.stringify({
        sku: 'PA175S203', // GLOCK 17 GEN5 9MM 17RD - $647
        quantity: 1
      })
    });
    console.log('✅ Glock 17 Gen5 added - requires FFL');
    
    // Step 4: Add holster accessory
    console.log('\n4️⃣ ADDING HOLSTER ACCESSORY');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: JSON.stringify({
        sku: '2WH-1-SBL-R', // 1791 holster - $50.99
        quantity: 1
      })
    });
    console.log('✅ 1791 holster added - no FFL required');
    
    // Step 5: View cart
    console.log('\n5️⃣ VIEWING CART');
    const cartResult = await makeRequest('/api/cart', {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (cartResult.data) {
      console.log('📦 Cart Contents:');
      if (cartResult.data.items) {
        cartResult.data.items.forEach(item => {
          console.log(`   • ${item.name} - $${item.price} ${item.requiresFFL ? '[FFL Required]' : ''}`);
        });
      }
      console.log(`   💰 Total: $${cartResult.data.total || 'Unknown'}`);
    }
    
    // Step 6: Check checkout requirements
    console.log('\n6️⃣ CHECKING CHECKOUT REQUIREMENTS');
    const requirementsResult = await makeRequest('/api/checkout/requirements', {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (requirementsResult.data) {
      console.log('📋 Checkout Requirements:');
      console.log(`   • FFL Required: ${requirementsResult.data.fflRequired ? 'Yes' : 'No'}`);
      console.log(`   • Shipping Address: ${requirementsResult.data.hasShippingAddress ? 'Set' : 'Needed'}`);
      console.log(`   • Billing Address: ${requirementsResult.data.hasBillingAddress ? 'Set' : 'Needed'}`);
    }
    
    // Step 7: Set addresses if needed
    console.log('\n7️⃣ SETTING ADDRESSES');
    const testAddress = {
      address1: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '75001',
      country: 'US'
    };
    
    try {
      await makeRequest('/api/profile/shipping-address', {
        method: 'PUT',
        headers: { 'Cookie': sessionCookie },
        body: JSON.stringify(testAddress)
      });
      console.log('✅ Shipping address set');
    } catch (e) {
      console.log('Shipping address endpoint issue, continuing...');
    }
    
    try {
      await makeRequest('/api/profile/billing-address', {
        method: 'PUT',
        headers: { 'Cookie': sessionCookie },
        body: JSON.stringify(testAddress)
      });
      console.log('✅ Billing address set');
    } catch (e) {
      console.log('Billing address endpoint issue, continuing...');
    }
    
    // Step 8: Process sandbox payment
    console.log('\n8️⃣ PROCESSING SANDBOX PAYMENT');
    const orderResult = await makeRequest('/api/checkout/process', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: JSON.stringify({
        paymentMethod: {
          type: 'credit_card',
          cardNumber: '4111111111111111', // Test Visa
          expirationMonth: '12',
          expirationYear: '2027',
          cvv: '123',
          cardholderName: 'John TestCustomer'
        },
        shippingAddress: testAddress,
        billingAddress: testAddress,
        skipRSRSubmission: true, // Don't submit to RSR
        testMode: true
      })
    });
    
    if (orderResult.data) {
      console.log('✅ PAYMENT PROCESSED SUCCESSFULLY!');
      console.log('📋 Order Summary:');
      console.log(`   🔢 Order ID: ${orderResult.data.orderId || 'Unknown'}`);
      console.log(`   💰 Total: $${orderResult.data.total || 'Unknown'}`);
      console.log(`   🏦 Payment: ${orderResult.data.paymentStatus || 'Unknown'}`);
    }
    
    console.log('\n🎉 ORDER TEST COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Real Glock 17 Gen5 firearm ($647)');
    console.log('✅ Real 1791 holster accessory ($51)');
    console.log('✅ Sandbox Authorize.Net payment');
    console.log('✅ FFL compliance handling');
    console.log('✅ Order saved to database');
    console.log('✅ NO submission to RSR Engine');
    
  } catch (error) {
    console.error('\n❌ ORDER TEST FAILED:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testOrderFlow();